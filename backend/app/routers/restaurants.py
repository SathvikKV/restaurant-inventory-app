import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.middleware.auth_middleware import get_current_user, require_owner
from app.models.public import Tenant, User
from app.services.tenant_service import (
    create_tenant, assign_user_to_tenant,
    get_tenant_by_id, get_tenants_for_user,
)
from app.services.auth_service import create_access_token
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class RestaurantCreate(BaseModel):
    name: str
    area: Optional[str] = None
    city: Optional[str] = None
    tenant_type: str = "restaurant"


class RestaurantResponse(BaseModel):
    id: str
    name: str
    schema_name: str
    tenant_type: str
    is_active: bool


@router.post("", response_model=RestaurantResponse, summary="Create a new restaurant")
async def create_restaurant(
    body: RestaurantCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new tenant (restaurant), assigns the current user as owner,
    and returns a new JWT with the restaurant context embedded.
    """
    tenant = await create_tenant(db, body.name, body.tenant_type)
    await assign_user_to_tenant(db, uuid.UUID(user["user_id"]), tenant.id, role="owner")

    return RestaurantResponse(
        id=str(tenant.id),
        name=tenant.name,
        schema_name=tenant.schema_name,
        tenant_type=tenant.tenant_type.value,
        is_active=tenant.is_active,
    )


@router.get("", summary="List restaurants for current user")
async def list_restaurants(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all restaurants the current user belongs to."""
    tenants = await get_tenants_for_user(db, uuid.UUID(user["user_id"]))
    return [
        RestaurantResponse(
            id=str(t.id),
            name=t.name,
            schema_name=t.schema_name,
            tenant_type=t.tenant_type.value,
            is_active=t.is_active,
        )
        for t in tenants
    ]


@router.get("/{restaurant_id}", summary="Get restaurant by ID")
async def get_restaurant(
    restaurant_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await get_tenant_by_id(db, uuid.UUID(restaurant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return RestaurantResponse(
        id=str(tenant.id),
        name=tenant.name,
        schema_name=tenant.schema_name,
        tenant_type=tenant.tenant_type.value,
        is_active=tenant.is_active,
    )


@router.post("/{restaurant_id}/select", summary="Select restaurant and get new JWT")
async def select_restaurant(
    restaurant_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Issues a new JWT with the selected restaurant's schema embedded.
    Use this token for all subsequent inventory/purchases/etc requests.
    """
    tenant = await get_tenant_by_id(db, uuid.UUID(restaurant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Verify user belongs to this tenant
    result = await db.execute(
        select(User).where(
            User.id == uuid.UUID(user["user_id"]),
            User.tenant_id == tenant.id,
        )
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=403, detail="You do not have access to this restaurant")

    access_token = create_access_token(
        user_id=str(db_user.id),
        role=db_user.role.value if hasattr(db_user.role, 'value') else db_user.role,
        tenant_id=str(tenant.id),
        schema_name=tenant.schema_name,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "tenant_id": str(tenant.id),
        "schema": tenant.schema_name,
        "restaurant_name": tenant.name,
    }
