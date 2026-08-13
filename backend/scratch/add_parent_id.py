import asyncio
from app.database import engine
from sqlalchemy import text

async def run():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE public.tenants ADD COLUMN parent_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;'))
            print('Added parent_id column')
        except Exception as e:
            print("Already exists or error:", e)

if __name__ == "__main__":
    asyncio.run(run())
