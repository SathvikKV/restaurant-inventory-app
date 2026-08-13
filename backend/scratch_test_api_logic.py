import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from decimal import Decimal

async def main():
    db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:Bal27inferno$$$@db.usogvehwozbmjbfubmks.supabase.co:5432/postgres")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        item_id = "58a91ac2-d190-4d03-8bbf-09fc9325a0d5"
        
        # 1. Fetch item
        result = await session.execute(text("SELECT * FROM minerva_coffee_shop.inventory WHERE id = :id"), {"id": item_id})
        item = result.fetchone()
        
        # 2. Fetch total consumed
        cutoff = datetime.now(timezone.utc) - timedelta(days=14)
        result = await session.execute(
            text("""
            SELECT SUM(quantity_delta) 
            FROM minerva_coffee_shop.inventory_transactions 
            WHERE item_id = :item_id 
              AND action IN ('issue', 'waste') 
              AND created_at >= :cutoff
            """), 
            {"item_id": item_id, "cutoff": cutoff}
        )
        total_consumed = result.scalar()
        
        print("total_consumed:", total_consumed)
        
        # 3. compute runway
        avg_daily_usage = None
        runway = None
        if total_consumed is not None and total_consumed < 0:
            avg_daily_usage = abs(total_consumed) / 14.0
            print("avg_daily_usage:", avg_daily_usage)
            if avg_daily_usage > 0:
                runway = max(0.0, float(item.current_qty)) / float(avg_daily_usage)
                print("runway:", runway)

if __name__ == "__main__":
    asyncio.run(main())
