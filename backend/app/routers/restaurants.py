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
    extract_sheet_id, call_mise_link_existing_sheet,
)
from app.services.auth_service import create_access_token
from app.config import get_settings
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
settings = get_settings()


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
    sheet_url: Optional[str] = None
    service_account_email: Optional[str] = None


class LinkSheetRequest(BaseModel):
    sheet_id_or_url: str
    restaurant_id: Optional[str] = None


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
        sheet_url=tenant.sheet_url,
        service_account_email=settings.google_service_account_email,
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
            sheet_url=t.sheet_url,
            service_account_email=settings.google_service_account_email,
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
        sheet_url=tenant.sheet_url,
        service_account_email=settings.google_service_account_email,
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

    user_role = db_user.role.value if hasattr(db_user.role, 'value') else db_user.role
    access_token = create_access_token(
        user_id=str(db_user.id),
        role=user_role,
        tenant_id=str(tenant.id),
        schema_name=tenant.schema_name,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "tenant_id": str(tenant.id),
        "schema": tenant.schema_name,
        "restaurant_name": tenant.name,
        "role": user_role,
    }


@router.post("/link-sheet", summary="Link an existing Google Sheet to the restaurant")
async def link_sheet(
    body: LinkSheetRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = body.restaurant_id or user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(
            status_code=400,
            detail="No restaurant specified. Please select a restaurant first."
        )

    tenant = await get_tenant_by_id(db, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    sheet_id = extract_sheet_id(body.sheet_id_or_url)
    if not sheet_id:
        raise HTTPException(status_code=400, detail="Invalid Google Sheet ID or URL")

    result = await call_mise_link_existing_sheet(sheet_id, tenant.name)
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Could not access that sheet. Make sure it's shared with the service account with edit access.")
        )

    tenant.spreadsheet_id = sheet_id
    tenant.sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}"
    db.add(tenant)
    await db.commit()
    return {"status": "linked", "sheet_url": tenant.sheet_url, "spreadsheet_id": tenant.spreadsheet_id}


@router.post("/{restaurant_id}/link-sheet", summary="Link an existing Google Sheet to a specific restaurant ID")
async def link_sheet_by_id(
    restaurant_id: str,
    body: LinkSheetRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    body.restaurant_id = restaurant_id
    return await link_sheet(body, user, db)
