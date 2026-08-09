import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from dotenv import load_dotenv

# Load models
from app.models.tenant import make_tenant_models
from app.services.pricing import price_per_base_unit

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check_summary():
    async with async_session() as session:
        schema = "deccan_2"
        models = make_tenant_models(schema)
        Purchase = models["purchases"]
        Issue = models["issues"]

        from datetime import datetime, timezone
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        issues = (await session.execute(select(Issue).where(Issue.created_at >= today_start))).scalars().all()
        all_purchases = (await session.execute(select(Purchase).order_by(Purchase.created_at.desc()))).scalars().all()

        price_lookup_old = {}
        price_lookup_new = {}

        for p in all_purchases:
            items = p.items if isinstance(p.items, list) else []
            for item in items:
                name = (item.get("item_name") or "").strip().lower()
                if name and item.get("unit_price"):
                    try:
                        raw_price = float(item["unit_price"])
                        if name not in price_lookup_old:
                            price_lookup_old[name] = raw_price
                        if name not in price_lookup_new:
                            unit = item.get("unit", "")
                            price_lookup_new[name] = price_per_base_unit(raw_price, unit)
                    except (ValueError, TypeError):
                        pass

        old_consumption = 0.0
        new_consumption = 0.0

        for issue in issues:
            items_val = issue.items if isinstance(issue.items, (dict, list)) else {}
            if isinstance(items_val, dict):
                if "items" in items_val and isinstance(items_val["items"], list):
                    entries = items_val["items"]
                else:
                    entries = [{"name": k, "qty": v} for k, v in items_val.items() if k != "items"]
            else:
                entries = items_val
            
            for entry in entries if isinstance(entries, list) else []:
                if isinstance(entry, dict):
                    name = (entry.get("item_name") or entry.get("name") or entry.get("item") or "").strip().lower()
                    try:
                        qty = float(entry.get("qty") or entry.get("quantity") or 0)
                    except:
                        qty = 0.0
                    old_consumption += qty * price_lookup_old.get(name, 0)
                    new_consumption += qty * price_lookup_new.get(name, 0)

        print(f"Old Consumption Calculation: {old_consumption}")
        print(f"New Consumption Calculation: {new_consumption}")
        print("Price diffs for top items:")
        for k in list(price_lookup_old.keys())[:10]:
            print(f"  {k}: {price_lookup_old[k]} -> {price_lookup_new[k]}")

if __name__ == "__main__":
    asyncio.run(check_summary())
