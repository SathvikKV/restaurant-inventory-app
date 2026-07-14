import uuid
from fastapi import APIRouter, HTTPException, status, Depends, Cookie
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.schemas.auth import (
    SendOTPRequest, SendOTPResponse,
    VerifyOTPRequest, TokenResponse,
    SelectRestaurantRequest, UserMeResponse,
)
from app.services.auth_service import (
    generate_otp, store_otp, verify_otp as verify_otp_code,
    get_or_create_user, get_user_by_id, get_user_tenants,
    create_access_token, create_refresh_token_str,
    store_refresh_token, rotate_refresh_token, invalidate_refresh_token,
)
from app.models.public import Tenant
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

    user = await get_or_create_user(db, body.phone)

    # Get user's tenant if assigned
    tenant_id = ""
    schema_name = ""
    if user.tenant_id:
        result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = result.scalar_one_or_none()
        if tenant:
            tenant_id = str(tenant.id)
            schema_name = tenant.schema_name

    access_token = create_access_token(
        user_id=str(user.id),
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        tenant_id=tenant_id,
        schema_name=schema_name,
    )
    refresh_token = create_refresh_token_str()
    await store_refresh_token(db, user.id, refresh_token)

    response = JSONResponse(content={
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "tenant_id": tenant_id,
        "schema": schema_name,
        "user_id": str(user.id),
        "user_name": user.name or "",
        "needs_restaurant_selection": tenant_id == "",
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

    tenant_id = ""
    schema_name = ""
    if user.tenant_id:
        result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = result.scalar_one_or_none()
        if tenant:
            tenant_id = str(tenant.id)
            schema_name = tenant.schema_name

    access_token = create_access_token(
        user_id=str(user.id),
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        tenant_id=tenant_id,
        schema_name=schema_name,
    )

    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key="refresh_token",
        value=new_token_str,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=30 * 24 * 60 * 60,
    )
    return response


@router.post("/select-restaurant", summary="Switch active restaurant context")
async def select_restaurant(
    body: SelectRestaurantRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-issues JWT with the selected restaurant's schema in the claims."""
    result = await db.execute(
        select(Tenant).where(Tenant.id == uuid.UUID(body.restaurant_id))
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    access_token = create_access_token(
        user_id=user["user_id"],
        role=user["role"],
        tenant_id=str(tenant.id),
        schema_name=tenant.schema_name,
    )
    return {"access_token": access_token, "token_type": "bearer"}


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
        role=db_user.role.value if hasattr(db_user.role, 'value') else db_user.role,
        tenant_id=str(db_user.tenant_id) if db_user.tenant_id else "",
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
