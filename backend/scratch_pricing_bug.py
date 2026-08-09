import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL found.")
    exit(1)

engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with async_session() as session:
        # We need to query tenants to find their schemas, then query purchases in each schema
        result = await session.execute(text("SELECT schema_name FROM public.tenants"))
        schemas = [row[0] for row in result.fetchall()]
        
        bugged_records = []
        for schema in schemas:
            print(f"Checking schema {schema}")
            try:
                # Query purchases in this schema
                query = text(f"SELECT id, items FROM {schema}.purchases")
                res = await session.execute(query)
                purchases = res.fetchall()
                for p in purchases:
                    p_id = p[0]
                    items = p[1]
                    if not items:
                        continue
                    if isinstance(items, dict):
                        items = [items]
                    
                    has_bug = False
                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        unit = item.get("unit")
                        unit_price = item.get("unit_price")
                        quantity = item.get("quantity")
                        total_price = item.get("total_price")
                        
                        if unit in ("g", "ml") and unit_price and quantity and total_price:
                            # if quantity * unit_price is way bigger than total_price
                            computed_total = float(quantity) * float(unit_price)
                            if computed_total > float(total_price) * 10:  # factor of 1000 usually
                                has_bug = True
                                print(f"Found bugged purchase {p_id} in {schema}: item={item.get('item_name')}, qty={quantity}{unit}, unit_price={unit_price}, total_price={total_price} (computed={computed_total})")
                                
                    if has_bug:
                        bugged_records.append({"schema": schema, "id": p_id})
            except Exception as e:
                print(f"Error checking {schema}: {e}")
                
        print(f"Total bugged purchases found: {len(bugged_records)}")

if __name__ == "__main__":
    asyncio.run(main())
