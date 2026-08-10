import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, column_default FROM information_schema.columns WHERE table_schema='minerva_coffee_shop' AND table_name='inventory'"))
        print(res.fetchall())

asyncio.run(check())
