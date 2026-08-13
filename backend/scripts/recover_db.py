import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
import os
from dotenv import load_dotenv
from sqlalchemy import text
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.models.public import User, UserTenantMembership, UserRole
from sqlalchemy import select

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise Exception("DATABASE_URL missing")
    
    # ensure asyncpg
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(db_url, echo=False)
    
    async with engine.begin() as conn:
        print("Restoring legacy columns 'tenant_id' and 'role' to 'public.users'...")
        # Check if type userrole exists, if not use varchar and we can alter later
        # But SQLAlchemy mapped_column(SAEnum(UserRole)) means the type is userrole
        try:
            await conn.execute(text("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id), ADD COLUMN IF NOT EXISTS role userrole;"))
        except Exception as e:
            print(f"Error adding with userrole: {e}. Trying VARCHAR...")
            await conn.execute(text("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id), ADD COLUMN IF NOT EXISTS role VARCHAR;"))
            
    print("Columns restored. Backfilling from user_tenant_memberships...")
    
    async with AsyncSession(engine) as session:
        # Get all memberships ordered by created_at asc
        stmt = select(UserTenantMembership).order_by(UserTenantMembership.user_id, UserTenantMembership.created_at.asc())
        result = await session.execute(stmt)
        memberships = result.scalars().all()
        
        user_memberships = {}
        for m in memberships:
            if m.user_id not in user_memberships:
                user_memberships[m.user_id] = []
            user_memberships[m.user_id].append(m)
            
        print(f"Found {len(user_memberships)} users with memberships.")
        
        for user_id, mems in user_memberships.items():
            if len(mems) > 1:
                print(f"[AMBIGUITY WARNING] User {user_id} has {len(mems)} memberships. Backfilling with the chronologically earliest one (tenant_id={mems[0].tenant_id}, role={mems[0].role}).")
                
            earliest_mem = mems[0]
            role_val = earliest_mem.role.value if hasattr(earliest_mem.role, 'value') else earliest_mem.role
            
            await session.execute(
                text("UPDATE public.users SET tenant_id = :t, role = :r WHERE id = :u"),
                {"t": earliest_mem.tenant_id, "r": role_val, "u": user_id}
            )
            
        await session.commit()
        print("Backfill complete.")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
