import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM minerva_coffee_shop.inventory WHERE item ILIKE '%flour%'"))
        rows = res.fetchall()
        for r in rows:
            print(dict(r._mapping))

asyncio.run(check())
