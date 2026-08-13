import uuid
from fastapi import APIRouter, HTTPException, status, Depends, Cookie, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.schemas.auth import (
    SendOTPRequest, SendOTPResponse,
    VerifyOTPRequest, TokenResponse,
    UserMeResponse, UpdateProfileRequest,
)
from app.services.auth_service import (
    generate_otp, store_otp, verify_otp as verify_otp_code,
    get_or_create_user, get_user_by_id, get_user_tenants,
    create_access_token, create_refresh_token_str,
    store_refresh_token, rotate_refresh_token, invalidate_refresh_token,
)
from app.models.public import Tenant, UserTenantMembership
from sqlalchemy import select

router = APIRouter()


@router.post("/request-otp", response_model=SendOTPResponse, summary="Send OTP to phone number")
async def request_otp(body: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Generates a 6-digit OTP and stores it in the DB.
    In mock mode (OTP_PROVIDER=mock), always generates 123456 and returns it in the response.
    In production, sends SMS via configured provider.
    """
    from app.config import get_settings
    settings = get_settings()

    otp_code = generate_otp()
    await store_otp(db, body.phone, otp_code)

    response = SendOTPResponse(message=f"OTP sent to {body.phone}", expires_in_seconds=300)

    # In mock mode, return the OTP directly so frontend can use it without SMS
    if settings.otp_provider == "mock":
        return JSONResponse(content={
            "message": f"OTP sent to {body.phone}",
            "expires_in_seconds": 300,
            "mock_otp": otp_code,  # only present in mock mode
        })
    return response


@router.post("/verify-otp", response_model=TokenResponse, summary="Verify OTP and issue JWT")
async def verify_otp(body: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Validates OTP, looks up or creates user, issues JWT access token + refresh token.
    If user has no tenant yet, tenant_id and schema will be empty strings.
    Frontend should redirect to restaurant selection screen.
    """
    valid = await verify_otp_code(db, body.phone, body.otp)
    if not valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP")

    user, is_new = await get_or_create_user(db, body.phone)

    # Get user's tenants
    result = await db.execute(
        select(UserTenantMembership, Tenant)
        .join(Tenant, UserTenantMembership.tenant_id == Tenant.id)
        .where(UserTenantMembership.user_id == user.id, Tenant.is_active == True)
    )
    memberships = result.all()
    
    tenant_id = ""
    schema_name = ""
    role = ""
    needs_restaurant_selection = True
    
    if len(memberships) == 1:
        membership, tenant = memberships[0]
        tenant_id = str(tenant.id)
        schema_name = tenant.schema_name
        role = membership.role.value if hasattr(membership.role, 'value') else membership.role
        needs_restaurant_selection = False

    access_token = create_access_token(
        user_id=str(user.id),
        role=role,
        tenant_id=tenant_id,
        schema_name=schema_name,
    )
    refresh_token = create_refresh_token_str()
    await store_refresh_token(db, user.id, refresh_token)

    response = JSONResponse(content={
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "tenant_id": tenant_id,
        "schema": schema_name,
        "user_id": str(user.id),
        "user_name": user.name or "",
        "needs_restaurant_selection": needs_restaurant_selection,
        "is_new_account": is_new,
    })
    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # set to True in production (HTTPS)
        samesite="lax",
        max_age=30 * 24 * 60 * 60,  # 30 days
    )
    return response


@router.post("/refresh", summary="Refresh access token")
async def refresh_token(
    request: Request,
    refresh_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    old_rt, new_token_str = await rotate_refresh_token(db, refresh_token)
    if not old_rt:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = await get_user_by_id(db, old_rt.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Get user's tenants
    result = await db.execute(
        select(UserTenantMembership, Tenant)
        .join(Tenant, UserTenantMembership.tenant_id == Tenant.id)
        .where(UserTenantMembership.user_id == user.id, Tenant.is_active == True)
    )
    memberships = result.all()
    
    tenant_id = ""
    schema_name = ""
    role = ""
    needs_restaurant_selection = True
    

    if needs_restaurant_selection and len(memberships) == 1:
        membership, tenant = memberships[0]
        tenant_id = str(tenant.id)
        schema_name = tenant.schema_name
        role = membership.role.value if hasattr(membership.role, 'value') else membership.role
        needs_restaurant_selection = False

    access_token = create_access_token(
        user_id=str(user.id),
        role=role,
        tenant_id=tenant_id,
        schema_name=schema_name,
    )

    response = JSONResponse(content={
        "access_token": access_token, 
        "token_type": "bearer",
        "role": role,
        "tenant_id": tenant_id,
        "schema": schema_name,
        "user_id": str(user.id),
        "user_name": user.name or "",
        "needs_restaurant_selection": needs_restaurant_selection,
    })
    response.set_cookie(
        key="refresh_token",
        value=new_token_str,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=30 * 24 * 60 * 60,
    )
    return response





@router.get("/me", response_model=UserMeResponse, summary="Get current authenticated user")
async def get_me(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_user = await get_user_by_id(db, uuid.UUID(user["user_id"]))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserMeResponse(
        id=str(db_user.id),
        name=db_user.name or "",
        phone=db_user.phone,
        role="",
        tenant_id="",  # Multi-membership users need to select a restaurant at login
        is_active=db_user.is_active,
    )


@router.patch("/me", response_model=UserMeResponse, summary="Update current authenticated user profile")
@router.post("/me", response_model=UserMeResponse, summary="Update current authenticated user profile")
async def update_me(
    body: UpdateProfileRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_user = await get_user_by_id(db, uuid.UUID(user["user_id"]))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db_user.name = body.name.strip() if body.name else None
    await db.commit()
    await db.refresh(db_user)
    return UserMeResponse(
        id=str(db_user.id),
        name=db_user.name or "",
        phone=db_user.phone,
        role="",
        tenant_id="",  # Multi-membership users need to select a restaurant at login
        is_active=db_user.is_active,
    )



@router.post("/logout", summary="Invalidate refresh token")
async def logout(
    refresh_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        await invalidate_refresh_token(db, refresh_token)
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("refresh_token")
    return response
