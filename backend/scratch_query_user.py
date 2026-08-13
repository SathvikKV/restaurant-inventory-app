import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:Bal27inferno$$$@db.usogvehwozbmjbfubmks.supabase.co:5432/postgres")
engine = create_async_engine(db_url)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with async_session() as session:
        # Query 1
        result = await session.execute(text("""
            SELECT item, unit, current_qty 
            FROM minerva_coffee_shop.inventory 
            WHERE item = 'All-purpose flour';
        """))
        print("Inventory:")
        for r in result.fetchall():
            print(dict(r._mapping))
            
        # Query 2
        result2 = await session.execute(text("""
            SELECT action, quantity_delta, unit, created_at 
            FROM minerva_coffee_shop.inventory_transactions 
            WHERE item_name = 'All-purpose flour' 
            ORDER BY created_at DESC;
        """))
        print("\nTransactions:")
        for r in result2.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
