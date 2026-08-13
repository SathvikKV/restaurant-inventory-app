import asyncio
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:Bal27inferno$$$@db.usogvehwozbmjbfubmks.supabase.co:5432/postgres")
engine = create_async_engine(db_url)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with async_session() as session:
        cutoff = datetime.now(timezone.utc) - timedelta(days=14)
        result = await session.execute(text("""
            SELECT SUM(t.quantity_delta) as total_consumed
            FROM minerva_coffee_shop.inventory_transactions t
            JOIN minerva_coffee_shop.inventory i ON i.id = t.item_id
            WHERE i.item = 'All-purpose flour'
              AND t.action IN ('issue', 'waste')
              AND t.created_at >= :cutoff
        """), {"cutoff": cutoff})
        
        row = result.fetchone()
        print("Total Consumed:", dict(row._mapping) if row else None)
        print("Cutoff date:", cutoff)

if __name__ == "__main__":
    asyncio.run(main())
