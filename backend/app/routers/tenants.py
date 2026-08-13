from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.public import User, Tenant
from app.services.tenant_registry import get_tenant_models
from app.services.tenant_service import find_identity_by_phone, find_identity_by_telegram_id
from app.services.mise_auth import verify_mise_service_token

router = APIRouter()

@router.get("/resolve-by-phone", summary="Resolve a phone number to tenant schema and role")
async def resolve_by_phone(phone: str, _: None = Depends(verify_mise_service_token), db: AsyncSession = Depends(get_db)):
    identity = await find_identity_by_phone(db, phone)
    if not identity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phone number not recognized")
    identity.pop("entity", None)
    return identity


@router.get("/resolve-by-telegram-id", summary="Resolve a telegram user ID to tenant schema and role")
async def resolve_by_telegram_id(telegram_id: str, _: None = Depends(verify_mise_service_token), db: AsyncSession = Depends(get_db)):
    identity = await find_identity_by_telegram_id(db, telegram_id)
    if not identity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telegram ID not recognized")
    identity.pop("entity", None)
    return identity


@router.get("/whitelist-directory", summary="List all recognized phone numbers across all tenants")
async def whitelist_directory(_: None = Depends(verify_mise_service_token), db: AsyncSession = Depends(get_db)):
    directory = []

    # 1. Active users (owners & managers)
    from app.models.public import UserTenantMembership
    users_res = await db.execute(
        select(User, Tenant, UserTenantMembership)
        .join(UserTenantMembership, User.id == UserTenantMembership.user_id)
        .join(Tenant, UserTenantMembership.tenant_id == Tenant.id)
        .where(User.is_active == True, Tenant.is_active == True)
    )
    for user, tenant, membership in users_res.all():
        role_str = membership.role.value if hasattr(membership.role, "value") else str(membership.role)
        directory.append({
            "phone": user.phone,
            "telegram_id": user.telegram_id,
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
                "telegram_id": getattr(contact, "telegram_id", None),
                "tenant_id": str(tenant.id),
                "schema": tenant.schema_name,
                "spreadsheet_id": tenant.spreadsheet_id,
                "name": contact.name,
                "role": contact.role_label,
                "source_type": "staff",
            })

    return directory
