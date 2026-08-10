import asyncio
from app.database import engine
from app.services.units import init_unit_cache, normalize_to_base

async def main():
    async with engine.connect() as conn:
        await init_unit_cache(conn)
        print("10 kg ->", normalize_to_base(10, 'kg'))
        print("10 g ->", normalize_to_base(10, 'g'))
        print("10 piece ->", normalize_to_base(10, 'piece'))
        print("10 other ->", normalize_to_base(10, 'other'))
        print("10 unknown ->", normalize_to_base(10, 'unknown'))

asyncio.run(main())
