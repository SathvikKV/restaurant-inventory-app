import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT schema_name FROM public.tenants"))
        schemas = [row[0] for row in res.fetchall()]
        for schema in schemas:
            try:
                items_res = await conn.execute(text(f"SELECT item, current_qty, unit FROM {schema}.inventory WHERE item ILIKE '%flour%'"))
                items = items_res.fetchall()
                if items:
                    print(f"--- Schema: {schema} ---")
                    for row in items:
                        print(f"Item: {row[0]}, Qty: {row[1]}, Unit: '{row[2]}'")
            except Exception as e:
                pass

asyncio.run(check())
