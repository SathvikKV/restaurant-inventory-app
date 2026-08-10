import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE event_object_table='inventory'"))
        print(res.fetchall())

asyncio.run(check())
