import asyncio
from app.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, name, schema_name, created_at FROM public.tenants WHERE schema_name = 'minerva_coffee_shop';"))
        for row in res:
            print(row)

asyncio.run(check())
