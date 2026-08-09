import asyncio
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select
from dotenv import load_dotenv

from app.models.public import Tenant
from app.services.tenant_registry import get_tenant_models
from app.database import engine

load_dotenv()

async def migrate_paise():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(select(Tenant.schema_name))
        schema_names = [row[0] for row in result.all()]
    
    total_migrated = 0
    total_skipped = 0
    total_already = 0

    for schema in schema_names:
        print(f"Migrating schema: {schema}")
        models = get_tenant_models(schema)
        Purchase = models["purchases"]
        
        async with async_session() as session:
            result = await session.execute(select(Purchase))
            purchases = result.scalars().all()
            
            for po in purchases:
                items = po.items
                if not items:
                    continue
                
                is_list = isinstance(items, list)
                item_list = items if is_list else [items]
                modified = False
                
                for it in item_list:
                    if not isinstance(it, dict):
                        continue
                        
                    if it.get("_paise_migrated"):
                        total_already += 1
                        continue
                        
                    skip_this_item = False
                    
                    new_up = None
                    up = it.get("unit_price")
                    if up is not None:
                        try:
                            new_up = int(round(float(up) * 100))
                        except (ValueError, TypeError):
                            skip_this_item = True
                            
                    new_tp = None
                    tp = it.get("total_price")
                    if tp is not None:
                        try:
                            new_tp = int(round(float(tp) * 100))
                        except (ValueError, TypeError):
                            skip_this_item = True
                            
                    new_ta = None
                    ta = it.get("total_amount")
                    if ta is not None:
                        try:
                            new_ta = int(round(float(ta) * 100))
                        except (ValueError, TypeError):
                            skip_this_item = True

                    if skip_this_item:
                        total_skipped += 1
                        continue
                            
                    if new_up is not None:
                        it["unit_price"] = new_up
                    if new_tp is not None:
                        it["total_price"] = new_tp
                    if new_ta is not None:
                        it["total_amount"] = new_ta
                        
                    it["_paise_migrated"] = True
                    modified = True
                    total_migrated += 1
                
                if modified:
                    po.items = item_list if is_list else item_list[0]
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(po, "items")
                    
            await session.commit()
            
    print(f"--- Migration Report ---")
    print(f"Migrated items: {total_migrated}")
    print(f"Skipped items (bad data): {total_skipped}")
    print(f"Already migrated (idempotent skips): {total_already}")

if __name__ == "__main__":
    asyncio.run(migrate_paise())
