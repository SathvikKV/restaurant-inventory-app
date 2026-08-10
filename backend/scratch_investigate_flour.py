import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from decimal import Decimal

# Ensure database URL is available
db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:Bal27inferno$$$@db.usogvehwozbmjbfubmks.supabase.co:5432/postgres")
engine = create_async_engine(db_url)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with async_session() as session:
        # Find the All-purpose flour item
        result = await session.execute(text("""
            SELECT id, item, current_qty, unit 
            FROM minerva_coffee_shop.inventory 
            WHERE item ILIKE '%flour%'
        """))
        items = result.fetchall()
        print("Flour Items:")
        for item in items:
            print(dict(item._mapping))
            
        if not items:
            print("No flour items found.")
            return
            
        flour_id = "58a91ac2-d190-4d03-8bbf-09fc9325a0d5"
        
        # Find transactions
        result = await session.execute(text("""
            SELECT id, action, quantity_delta, unit, created_at, notes, resulting_qty
            FROM minerva_coffee_shop.inventory_transactions
            WHERE item_id = :item_id
            ORDER BY created_at DESC
        """), {"item_id": flour_id})
        
        transactions = result.fetchall()
        print(f"\nTransactions for {flour_id}:")
        for tx in transactions:
            print(dict(tx._mapping))

if __name__ == "__main__":
    asyncio.run(main())
