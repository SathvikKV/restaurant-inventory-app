import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
import os
from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise Exception("DATABASE_URL missing")
    
    # ensure asyncpg
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(db_url, echo=True)
    async with engine.begin() as conn:
        print("Dropping legacy columns 'tenant_id' and 'role' from 'public.users'...")
        await conn.execute(text("ALTER TABLE public.users DROP COLUMN IF EXISTS tenant_id, DROP COLUMN IF EXISTS role;"))
        print("Columns dropped successfully.")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
