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
from app.models.public import User, Tenant, UserTenantMembership
from app.schemas.common import UserResponse, UserCreate, UserUpdate
from pydantic import BaseModel

class StaffContactCreate(BaseModel):
    name: str
    phone: str
    role_label: str

class LinkTelegramRequest(BaseModel):
    telegram_id: str
    phone: str

class RegisterPushTokenRequest(BaseModel):
    expo_push_token: str

router = APIRouter()

def _map_user_response(user: User, role: str, tenant_id: str) -> dict:
    return {
        "id": str(user.id),
        "name": user.name or "",
        "phone": user.phone,
        "role": role,
        "restaurant_id": tenant_id,
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

    stmt = select(User, UserTenantMembership).join(UserTenantMembership, User.id == UserTenantMembership.user_id).where(UserTenantMembership.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    rows = result.all()
    
    return [_map_user_response(u, m.role.value if hasattr(m.role, 'value') else m.role, tenant_id) for u, m in rows]


@router.get("/{user_id}", response_model=UserResponse, summary="Get a single user")
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")

    stmt = select(User, UserTenantMembership).join(UserTenantMembership, User.id == UserTenantMembership.user_id).where(User.id == uuid.UUID(user_id), UserTenantMembership.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in this restaurant")
    user, membership = row
    return _map_user_response(user, membership.role.value if hasattr(membership.role, 'value') else membership.role, tenant_id)


@router.post("/invite-to-restaurant", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Add existing user to restaurant")
async def invite_to_restaurant(
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

    if not existing_user:
        raise HTTPException(status_code=400, detail="This phone number hasn't signed up yet")

    # Check if they are already in this restaurant
    mem_stmt = select(UserTenantMembership).where(UserTenantMembership.user_id == existing_user.id, UserTenantMembership.tenant_id == uuid.UUID(tenant_id))
    mem_res = await db.execute(mem_stmt)
    existing_mem = mem_res.scalar_one_or_none()

    if existing_mem:
        raise HTTPException(status_code=400, detail="User already belongs to this restaurant")

    # Update name if it was null
    if not existing_user.name and body.name:
        existing_user.name = body.name

    new_membership = UserTenantMembership(
        user_id=existing_user.id,
        tenant_id=uuid.UUID(tenant_id),
        role=body.role
    )
    db.add(new_membership)

    await db.commit()
    await db.refresh(existing_user)
    return _map_user_response(existing_user, body.role, tenant_id)


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

    stmt = select(User, UserTenantMembership).join(UserTenantMembership, User.id == UserTenantMembership.user_id).where(User.id == uuid.UUID(user_id), UserTenantMembership.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in this restaurant")
    user, membership = row

    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        membership.role = body.role
    if body.is_active is not None:
        # Note: changing is_active here deactivated the WHOLE user account before.
        # Now we'll just keep that behavior for legacy reasons, but usually you'd want to pause membership.
        user.is_active = body.is_active

    await db.commit()
    return _map_user_response(user, membership.role.value if hasattr(membership.role, 'value') else membership.role, tenant_id)


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

    stmt = select(UserTenantMembership).where(UserTenantMembership.user_id == uuid.UUID(user_id), UserTenantMembership.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    membership = result.scalar_one_or_none()
    
    if membership:
        # Instead of deactivating the whole user account, just remove their membership from this restaurant
        await db.delete(membership)
        await db.commit()

    return None

@router.post("/register-push-token", status_code=status.HTTP_200_OK, summary="Register an Expo push token for the current user")
async def register_push_token_endpoint(
    body: RegisterPushTokenRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models.public import PushToken
    from sqlalchemy.dialects.postgresql import insert
    
    user_uuid = uuid.UUID(current_user["user_id"])
    
    stmt = insert(PushToken).values(
        user_id=user_uuid,
        expo_push_token=body.expo_push_token
    ).on_conflict_do_update(
        index_elements=['expo_push_token'],
        set_=dict(updated_at=text("now()"))
    )
    
    await db.execute(stmt)
    await db.commit()
    
    return {"status": "ok"}

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
