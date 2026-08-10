import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM public.units_of_measure"))
        rows = res.fetchall()
        for r in rows:
            print(dict(r._mapping))

asyncio.run(check())
