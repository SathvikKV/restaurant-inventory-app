import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Bal27inferno$$$@db.usogvehwozbmjbfubmks.supabase.co:5432/postgres"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS spreadsheet_id VARCHAR;"))
        await conn.execute(text("ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS sheet_url VARCHAR;"))
    print("Columns added successfully.")

if __name__ == "__main__":
    asyncio.run(main())
