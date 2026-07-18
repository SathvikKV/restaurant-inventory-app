import uuid
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from app.models.public import Tenant, User
from app.models.tenant import make_tenant_models
from app.database import create_tenant_schema, engine, Base

def slugify(name: str) -> str:
    """Convert restaurant name to a valid Postgres schema name."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '_', slug)
    slug = slug.strip('_')
    slug = slug[:50]
    return slug or "tenant"

def make_unique_schema_name(base: str, existing: list[str]) -> str:
    """Append a number suffix if slug already exists."""
    if base not in existing:
        return base
    i = 2
    while f"{base}_{i}" in existing:
        i += 1
    return f"{base}_{i}"

async def create_tenant(
    db: AsyncSession,
    name: str,
    tenant_type: str = "restaurant",
) -> Tenant:
    """
    Creates a new tenant:
    1. Generates unique schema name from restaurant name
    2. Creates Tenant record in public.tenants
    3. Creates Postgres schema
    4. Creates tables in the new schema
    """
    # Get existing schema names to avoid collisions
    result = await db.execute(select(Tenant.schema_name))
    existing = [row[0] for row in result.fetchall()]

    base_slug = slugify(name)
    schema_name = make_unique_schema_name(base_slug, existing)

    tenant = Tenant(
        name=name,
        schema_name=schema_name,
        tenant_type=tenant_type,
        is_active=True,
    )
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)

    # Create schema AND tables in the same connection to avoid pooler isolation issues
    make_tenant_models(schema_name)
    async with engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
        await conn.run_sync(Base.metadata.create_all)

    return tenant

async def assign_user_to_tenant(
    db: AsyncSession,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    role: str = "owner",
) -> User:
    """Assign a user to a tenant and set their role."""
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(tenant_id=tenant_id, role=role)
    )
    await db.commit()
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one()

async def get_tenant_by_id(db: AsyncSession, tenant_id: uuid.UUID):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    return result.scalar_one_or_none()

async def get_tenants_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[Tenant]:
    """Return all active tenants this user belongs to."""
    result = await db.execute(
        select(Tenant)
        .join(User, User.tenant_id == Tenant.id)
        .where(User.id == user_id, Tenant.is_active == True)
    )
    return result.scalars().all()
