from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.public import User, Tenant
from app.services.tenant_registry import get_tenant_models
from app.services.mise_auth import verify_mise_service_token

router = APIRouter()

@router.get("/resolve-by-phone", summary="Resolve a phone number to tenant schema and role")
async def resolve_by_phone(phone: str, _: None = Depends(verify_mise_service_token), db: AsyncSession = Depends(get_db)):
    # Check public.users first (owners/managers)
    user_result = await db.execute(select(User).where(User.phone == phone, User.is_active == True))
    user = user_result.scalar_one_or_none()
    if user and user.tenant_id:
        tenant = await db.get(Tenant, user.tenant_id)
        if tenant and tenant.is_active:
            role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
            return {
                "tenant_id": str(tenant.id),
                "schema": tenant.schema_name,
                "spreadsheet_id": tenant.spreadsheet_id,
                "name": user.name,
                "role": role_str,
            }

    # Option 1: Check staff_contacts across all tenants
    tenants_result = await db.execute(select(Tenant).where(Tenant.is_active == True))
    tenants = tenants_result.scalars().all()

    # Pre-query existing schemas with staff_contacts table to avoid transaction abort on non-existent tables
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
            }

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phone number not recognized")


@router.get("/whitelist-directory", summary="List all recognized phone numbers across all tenants")
async def whitelist_directory(_: None = Depends(verify_mise_service_token), db: AsyncSession = Depends(get_db)):
    directory = []

    # 1. Active users (owners & managers)
    users_res = await db.execute(
        select(User, Tenant)
        .join(Tenant, User.tenant_id == Tenant.id)
        .where(User.is_active == True, Tenant.is_active == True)
    )
    for user, tenant in users_res.all():
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        directory.append({
            "phone": user.phone,
            "tenant_id": str(tenant.id),
            "schema": tenant.schema_name,
            "spreadsheet_id": tenant.spreadsheet_id,
            "name": user.name,
            "role": role_str,
            "source_type": "user",
        })

    # 2. Staff contacts across tenants (Option 1: loop over schemas)
    tenants_res = await db.execute(select(Tenant).where(Tenant.is_active == True))
    tenants = tenants_res.scalars().all()

    tables_res = await db.execute(
        text("SELECT table_schema FROM information_schema.tables WHERE table_name = 'staff_contacts'")
    )
    valid_schemas = {row[0] for row in tables_res.all()}

    for tenant in tenants:
        if tenant.schema_name not in valid_schemas:
            continue
        models = get_tenant_models(tenant.schema_name)
        StaffContact = models["staff_contacts"]
        contacts_res = await db.execute(select(StaffContact))
        for contact in contacts_res.scalars().all():
            directory.append({
                "phone": contact.phone,
                "tenant_id": str(tenant.id),
                "schema": tenant.schema_name,
                "spreadsheet_id": tenant.spreadsheet_id,
                "name": contact.name,
                "role": contact.role_label,
                "source_type": "staff",
            })

    return directory
