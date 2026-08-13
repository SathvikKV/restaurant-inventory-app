import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

async def main():
    db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:Bal27inferno$$$@db.usogvehwozbmjbfubmks.supabase.co:5432/postgres")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(text("SELECT id, item, current_qty, unit, avg_price_per_base_unit FROM minerva_coffee_shop.inventory WHERE item = 'All-purpose flour';"))
        items = result.fetchall()
        print("Raw Database Data:")
        for item in items:
            print(dict(item._mapping))

if __name__ == "__main__":
    asyncio.run(main())
