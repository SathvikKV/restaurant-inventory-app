import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Ensure database URL is available
db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:Bal27inferno$$$@db.usogvehwozbmjbfubmks.supabase.co:5432/postgres")
engine = create_async_engine(db_url)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with async_session() as session:
        flour_id = "58a91ac2-d190-4d03-8bbf-09fc9325a0d5"
        
        # 1. Check current state
        result = await session.execute(text("""
            SELECT current_qty FROM minerva_coffee_shop.inventory WHERE id = :id
        """), {"id": flour_id})
        before_qty = result.scalar()
        
        # 2. Delete the two bad transactions
        await session.execute(text("""
            DELETE FROM minerva_coffee_shop.inventory_transactions
            WHERE id IN ('6a80cb00-5383-4ef9-b195-8ac8b640cb78', '380da0e9-bd0d-4774-813e-0e6e7c5be593')
        """))
        
        # 3. Update the inventory item
        await session.execute(text("""
            UPDATE minerva_coffee_shop.inventory
            SET current_qty = 8000.0
            WHERE id = :id
        """), {"id": flour_id})
        
        await session.commit()
        
        # 4. Check new state
        result = await session.execute(text("""
            SELECT current_qty FROM minerva_coffee_shop.inventory WHERE id = :id
        """), {"id": flour_id})
        after_qty = result.scalar()
        
        print(f"Before fix: {before_qty}g")
        print(f"After fix: {after_qty}g")
        print("Removed the two bad transactions ('6a80cb00-5383-4ef9-b195-8ac8b640cb78', '380da0e9-bd0d-4774-813e-0e6e7c5be593').")

if __name__ == "__main__":
    asyncio.run(main())
