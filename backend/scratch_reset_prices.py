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
        # First, let's verify what we are updating
        result = await session.execute(text("SELECT item, avg_price_per_base_unit, current_qty FROM minerva_coffee_shop.inventory WHERE avg_price_per_base_unit IS NOT NULL;"))
        rows = result.fetchall()
        print("Rows to update:")
        for r in rows:
            print(dict(r._mapping))
            
        # Perform the update
        await session.execute(text("UPDATE minerva_coffee_shop.inventory SET avg_price_per_base_unit = NULL WHERE avg_price_per_base_unit IS NOT NULL;"))
        await session.commit()
        print("Update committed. Set avg_price_per_base_unit to NULL for all affected items.")

if __name__ == "__main__":
    asyncio.run(main())
