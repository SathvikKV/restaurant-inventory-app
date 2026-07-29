"""
Users router — manage team members.
"""
import uuid
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import require_schema, get_tenant_models
from app.models.public import User
from app.schemas.common import UserResponse, UserCreate, UserUpdate
from pydantic import BaseModel

class StaffContactCreate(BaseModel):
    name: str
    phone: str
    role_label: str

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


@router.get("/", response_model=List[UserResponse], summary="List all users for the restaurant")
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
