import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine, Base, create_tenant_schema
from app.models.public import Tenant, User, OTPCode, RefreshToken, PushToken
from app.models.tenant import make_tenant_models

async def init():
    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS public.refresh_tokens CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS public.push_tokens CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS public.otp_codes CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS public.users CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS public.tenants CASCADE"))
        await conn.execute(text("DROP TYPE IF EXISTS public.userrole CASCADE"))
        await conn.execute(text("DROP TYPE IF EXISTS public.tenanttype CASCADE"))
    print("Dropped existing public schema tables.")

    print("Creating public schema tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Public schema tables created.")

    print("Creating minerva tenant schema...")
    await create_tenant_schema("minerva")

    print("Creating minerva schema tables...")
    make_tenant_models("minerva")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Minerva schema tables created.")

    print("Done.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init())
