import uuid
import re
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from app.models.public import Tenant, User, UserTenantMembership
from app.models.tenant import make_tenant_models
from app.database import create_tenant_schema, engine, Base
from app.services.tenant_registry import get_tenant_models
import logging
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)

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
    user_id: uuid.UUID,
    tenant_type: str = "restaurant",
) -> Tenant:
    """
    Creates a new tenant:
    1. Generates unique schema name from restaurant name
    2. Creates Tenant record in public.tenants
    3. Creates Postgres schema
    4. Creates tables in the new schema
    """
    from fastapi import HTTPException
    
    # 1. Check if this user already has a restaurant with this exact name
    user_tenants = await get_tenants_for_user(db, user_id)
    for t in user_tenants:
        if t.name.strip().lower() == name.strip().lower():
            raise HTTPException(status_code=400, detail="You already have a restaurant registered with this name. Did you mean to select it instead of creating a new one?")
            
    # 2. Check if the schema name (slug) already exists globally
    base_slug = slugify(name)
    result = await db.execute(select(Tenant.schema_name).where(Tenant.schema_name == base_slug))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"This restaurant name is already registered. Please add a branch or location name (e.g., '{name} — Jubilee Hills') to distinguish it.")

    schema_name = base_slug

    tenant = Tenant(
        name=name,
        schema_name=schema_name,
        tenant_type=tenant_type,
        is_active=True,
    )
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)

    make_tenant_models(schema_name)

    # Use asyncpg directly with autocommit for schema DDL
    # This bypasses the session pooler transaction isolation issue
    import asyncpg
    import os
    
    db_url = os.environ.get("DATABASE_URL", "")
    # Convert SQLAlchemy URL to asyncpg format
    asyncpg_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    raw_conn = await asyncpg.connect(asyncpg_url)
    try:
        await raw_conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
    finally:
        await raw_conn.close()
    
    # Now create tables — schema is committed and visible
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Provision sheet
    settings = get_settings()
    if settings.mise_writeback_url:
        provision_url = settings.mise_writeback_url.rsplit('/kosh/write-back', 1)[0] + "/kosh/provision-sheet"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    provision_url,
                    json={"restaurant_name": name},
                    headers={"X-Sync-Token": settings.mise_inbound_secret},
                )
                resp.raise_for_status()
                data = resp.json()
                tenant.spreadsheet_id = data.get("spreadsheet_id")
                tenant.sheet_url = data.get("sheet_url")
                db.add(tenant)
                await db.commit()
                await db.refresh(tenant)
        except Exception as e:
            logger.error(f"Sheet provisioning failed for new tenant {name}: {e}")

    return tenant

async def assign_user_to_tenant(
    db: AsyncSession,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    role: str = "owner",
) -> User:
    """Assign a user to a tenant by creating/updating a UserTenantMembership row."""
    # Check if membership already exists
    existing = await db.execute(
        select(UserTenantMembership).where(
            UserTenantMembership.user_id == user_id,
            UserTenantMembership.tenant_id == tenant_id,
        )
    )
    membership = existing.scalar_one_or_none()
    if membership:
        membership.role = role
    else:
        membership = UserTenantMembership(user_id=user_id, tenant_id=tenant_id, role=role)
        db.add(membership)
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
        .join(UserTenantMembership, UserTenantMembership.tenant_id == Tenant.id)
        .where(UserTenantMembership.user_id == user_id, Tenant.is_active == True)
    )
    return result.scalars().all()


async def find_identity_by_phone(db: AsyncSession, phone: str) -> Optional[Dict[str, Any]]:
    """Look up a user or staff contact across all tenants by phone number."""
    user_result = await db.execute(select(User).where(User.phone == phone, User.is_active == True))
    user = user_result.scalar_one_or_none()
    if user:
        mem_result = await db.execute(
            select(UserTenantMembership, Tenant)
            .join(Tenant, UserTenantMembership.tenant_id == Tenant.id)
            .where(UserTenantMembership.user_id == user.id, Tenant.is_active == True)
        )
        mem_row = mem_result.first()
        if mem_row:
            membership, tenant = mem_row
            role_str = membership.role.value if hasattr(membership.role, "value") else str(membership.role)
            return {
                "tenant_id": str(tenant.id),
                "schema": tenant.schema_name,
                "spreadsheet_id": tenant.spreadsheet_id,
                "name": user.name,
                "role": role_str,
                "source": "user",
                "contact_id": str(user.id),
                "entity": user,
            }

    tenants_result = await db.execute(select(Tenant).where(Tenant.is_active == True))
    tenants = tenants_result.scalars().all()

    tables_res = await db.execute(
        text("SELECT table_schema FROM information_schema.tables WHERE table_name = 'staff_contacts'")
    )
    valid_schemas = {row[0] for row in tables_res.all()}

    for tenant in tenants:
        if tenant.schema_name not in valid_schemas:
            continue
        models = get_tenant_models(tenant.schema_name)
        StaffContact = models["staff_contacts"]
        contact_res = await db.execute(select(StaffContact).where(StaffContact.phone == phone))
        contact = contact_res.scalar_one_or_none()
        if contact:
            return {
                "tenant_id": str(tenant.id),
                "schema": tenant.schema_name,
                "spreadsheet_id": tenant.spreadsheet_id,
                "name": contact.name,
                "role": contact.role_label,
                "source": "staff_contact",
                "contact_id": str(contact.id),
                "entity": contact,
            }
    return None


async def find_identity_by_telegram_id(db: AsyncSession, telegram_id: str) -> Optional[Dict[str, Any]]:
    """Look up a user or staff contact across all tenants by Telegram user ID."""
    user_result = await db.execute(select(User).where(User.telegram_id == telegram_id, User.is_active == True))
    user = user_result.scalar_one_or_none()
    if user:
        mem_result = await db.execute(
            select(UserTenantMembership, Tenant)
            .join(Tenant, UserTenantMembership.tenant_id == Tenant.id)
            .where(UserTenantMembership.user_id == user.id, Tenant.is_active == True)
        )
        mem_row = mem_result.first()
        if mem_row:
            membership, tenant = mem_row
            role_str = membership.role.value if hasattr(membership.role, "value") else str(membership.role)
            return {
                "tenant_id": str(tenant.id),
                "schema": tenant.schema_name,
                "spreadsheet_id": tenant.spreadsheet_id,
                "name": user.name,
                "role": role_str,
                "source": "user",
                "contact_id": str(user.id),
                "entity": user,
            }

    tenants_result = await db.execute(select(Tenant).where(Tenant.is_active == True))
    tenants = tenants_result.scalars().all()

    tables_res = await db.execute(
        text("SELECT table_schema FROM information_schema.tables WHERE table_name = 'staff_contacts'")
    )
    valid_schemas = {row[0] for row in tables_res.all()}

    for tenant in tenants:
        if tenant.schema_name not in valid_schemas:
            continue
        models = get_tenant_models(tenant.schema_name)
        StaffContact = models["staff_contacts"]
        contact_res = await db.execute(select(StaffContact).where(StaffContact.telegram_id == telegram_id))
        contact = contact_res.scalar_one_or_none()
        if contact:
            return {
                "tenant_id": str(tenant.id),
                "schema": tenant.schema_name,
                "spreadsheet_id": tenant.spreadsheet_id,
                "name": contact.name,
                "role": contact.role_label,
                "source": "staff_contact",
                "contact_id": str(contact.id),
                "entity": contact,
            }
    return None


def extract_sheet_id(url_or_id: str) -> str:
    s = url_or_id.strip()
    if "/spreadsheets/d/" in s:
        parts = s.split("/spreadsheets/d/")[1]
        return parts.split("/")[0].split("?")[0].split("#")[0]
    return s


async def call_mise_link_existing_sheet(sheet_id: str, tenant_name: str = None) -> dict:
    settings = get_settings()
    if not settings.mise_writeback_url:
        return {"success": True}
    link_url = settings.mise_writeback_url.rsplit('/kosh/write-back', 1)[0] + "/kosh/link-existing-sheet"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                link_url,
                json={"sheet_id": sheet_id},
                headers={"X-Sync-Token": settings.mise_inbound_secret},
            )
            if resp.status_code == 200:
                return resp.json()
            else:
                return {"success": False, "error": f"Mise service returned status {resp.status_code}: {resp.text}"}
    except Exception as e:
        logger.error(f"Failed to link existing sheet {sheet_id}: {e}")
        return {"success": False, "error": str(e)}

