import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
db_url = os.environ.get('DATABASE_URL', 'postgresql+asyncpg://postgres:Bal27inferno$$$@db.usogvehwozbmjbfubmks.supabase.co:5432/postgres')
engine = create_async_engine(db_url)
async def main():
    async with engine.connect() as conn:
        await conn.execute(text("UPDATE minerva_coffee_shop.inventory SET avg_price_per_base_unit = 0.05 WHERE id = '58a91ac2-d190-4d03-8bbf-09fc9325a0d5'"))
        await conn.commit()
        print("Updated avg_price_per_base_unit to 0.05")
asyncio.run(main())
