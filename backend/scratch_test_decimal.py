import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.models.tenant import InventoryItem
from app.database import Base

async def main():
    db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:Bal27inferno$$$@db.usogvehwozbmjbfubmks.supabase.co:5432/postgres")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        item_id = "58a91ac2-d190-4d03-8bbf-09fc9325a0d5"
        
        result = await session.execute(text("SELECT current_qty FROM minerva_coffee_shop.inventory WHERE id = :id"), {"id": item_id})
        current_qty = result.scalar()
        print("Type of current_qty:", type(current_qty))
        
        total_consumed = -2000.0
        avg_daily_usage = abs(total_consumed) / 14.0
        
        try:
            runway = max(0.0, current_qty) / avg_daily_usage
            print("Runway computed:", runway)
        except Exception as e:
            print("Error computing runway:", e)

if __name__ == "__main__":
    asyncio.run(main())
