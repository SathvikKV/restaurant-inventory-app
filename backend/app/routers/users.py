"""
Users router — manage team members.
"""
import uuid
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import List

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import require_schema, get_tenant_models
from app.services.mise_auth import verify_mise_service_token
from app.services.tenant_service import find_identity_by_phone
from app.models.public import User, Tenant
from app.schemas.common import UserResponse, UserCreate, UserUpdate
from pydantic import BaseModel

class StaffContactCreate(BaseModel):
    name: str
    phone: str
    role_label: str

class LinkTelegramRequest(BaseModel):
    telegram_id: str
    phone: str

router = APIRouter()

def _map_user_response(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.name or "",
        "phone": user.phone,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "restaurant_id": str(user.tenant_id) if user.tenant_id else "",
        "is_active": user.is_active,
    }


@router.get("", response_model=List[UserResponse], summary="List all users for the restaurant")
async def list_users(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")

    stmt = select(User).where(User.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    return [_map_user_response(u) for u in users]


@router.get("/{user_id}", response_model=UserResponse, summary="Get a single user")
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")

    user = await db.get(User, uuid.UUID(user_id))
    if not user or str(user.tenant_id) != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return _map_user_response(user)


@router.post("/invite", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Invite a new user")
async def invite_user(
    body: UserCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")

    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owner can invite users")

    # Check if user already exists
    stmt = select(User).where(User.phone == body.phone)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.tenant_id:
            raise HTTPException(status_code=400, detail="User already belongs to a restaurant")
        existing_user.name = body.name
        existing_user.role = body.role
        existing_user.tenant_id = uuid.UUID(tenant_id)
        existing_user.is_active = True
        user_to_return = existing_user
    else:
        new_user = User(
            phone=body.phone,
            name=body.name,
            role=body.role,
            tenant_id=uuid.UUID(tenant_id),
            is_active=True
        )
        db.add(new_user)
        user_to_return = new_user

    await db.commit()
    await db.refresh(user_to_return)
    return _map_user_response(user_to_return)


@router.patch("/{user_id}", response_model=UserResponse, summary="Update a user's role or status")
async def update_user(
    user_id: str,
    body: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")

    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owner can update users")

    user = await db.get(User, uuid.UUID(user_id))
    if not user or str(user.tenant_id) != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)
    return _map_user_response(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Deactivate a user")
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")

    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owner can deactivate users")

    user = await db.get(User, uuid.UUID(user_id))
    if user and str(user.tenant_id) == tenant_id:
        user.is_active = False
        await db.commit()

    return None

@router.post("/staff-contacts", summary="Register a staff contact for future WhatsApp connection")
async def create_staff_contact(body: StaffContactCreate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    schema = require_schema(user)
    models = get_tenant_models(schema)
    StaffContact = models["staff_contacts"]
    contact = StaffContact(name=body.name, phone=body.phone, role_label=body.role_label)
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return {"id": str(contact.id), "name": contact.name, "phone": contact.phone, "role_label": contact.role_label, "status": contact.status}

@router.get("/staff-contacts", summary="List staff contacts for the restaurant")
async def list_staff_contacts(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    schema = require_schema(user)
    models = get_tenant_models(schema)
    StaffContact = models["staff_contacts"]
    result = await db.execute(select(StaffContact))
    return [{"id": str(c.id), "name": c.name, "phone": c.phone, "role_label": c.role_label, "status": c.status} for c in result.scalars().all()]

@router.post("/staff-contacts/{contact_id}/mark-connected", summary="Mark a staff contact as connected after WhatsApp interaction")
async def mark_staff_contact_connected(contact_id: str, _: None = Depends(verify_mise_service_token), db: AsyncSession = Depends(get_db)):
    tenants_res = await db.execute(select(Tenant).where(Tenant.is_active == True))
    tenants = tenants_res.scalars().all()

    tables_res = await db.execute(
        text("SELECT table_schema FROM information_schema.tables WHERE table_name = 'staff_contacts'")
    )
    valid_schemas = {row[0] for row in tables_res.all()}

    try:
        contact_uuid = uuid.UUID(contact_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid contact ID format")

    for tenant in tenants:
        if tenant.schema_name not in valid_schemas:
            continue
        models = get_tenant_models(tenant.schema_name)
        StaffContact = models["staff_contacts"]
        contact = await db.get(StaffContact, contact_uuid)
        if contact:
            contact.status = "connected"
            await db.commit()
            return {"status": "ok", "contact_id": contact_id, "schema": tenant.schema_name}

    raise HTTPException(status_code=404, detail="Staff contact not found")


@router.post("/link-telegram-id", summary="Link a Telegram user ID to an existing staff contact or user via phone lookup")
async def link_telegram_id(body: LinkTelegramRequest, _: None = Depends(verify_mise_service_token), db: AsyncSession = Depends(get_db)):
    identity = await find_identity_by_phone(db, body.phone)
    if not identity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phone number not recognized")
    entity = identity["entity"]
    entity.telegram_id = body.telegram_id
    await db.commit()
    return {"status": "linked", "name": identity["name"] or "", "schema": identity["schema"]}
