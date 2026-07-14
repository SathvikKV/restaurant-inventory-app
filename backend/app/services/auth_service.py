import uuid
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.config import get_settings
from app.models.public import User, OTPCode, RefreshToken, Tenant

settings = get_settings()

# ---------------------------------------------------------------------------
# OTP
# ---------------------------------------------------------------------------

def generate_otp() -> str:
    """Generate a 6-digit OTP. Returns 123456 in mock mode."""
    if settings.otp_provider == "mock":
        return "123456"
    return "".join(random.choices(string.digits, k=6))

async def store_otp(db: AsyncSession, phone: str, code: str) -> None:
    """Store OTP in DB with 5 minute expiry. Invalidate previous OTPs for this phone."""
    # Mark all existing unused OTPs for this phone as used
    await db.execute(
        update(OTPCode)
        .where(OTPCode.phone == phone, OTPCode.used == False)
        .values(used=True)
    )
    otp = OTPCode(
        phone=phone,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        used=False,
    )
    db.add(otp)
    await db.commit()

async def verify_otp(db: AsyncSession, phone: str, code: str) -> bool:
    """
    Returns True if OTP is valid, not expired, and not used.
    Marks it as used on success.
    """
    result = await db.execute(
        select(OTPCode)
        .where(
            OTPCode.phone == phone,
            OTPCode.code == code,
            OTPCode.used == False,
        )
        .order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    otp = result.scalar_one_or_none()
    if not otp:
        return False
    if datetime.now(timezone.utc) > otp.expires_at.replace(tzinfo=timezone.utc):
        return False
    otp.used = True
    await db.commit()
    return True

# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

async def get_or_create_user(db: AsyncSession, phone: str) -> User:
    """
    Returns the existing user for this phone, or creates a new one.
    New users are created without a tenant — they must select/create one after login.
    """
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(phone=phone, name=None, role="manager")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def get_user_tenants(db: AsyncSession, user_id: uuid.UUID) -> list[Tenant]:
    """Return all tenants this user belongs to."""
    result = await db.execute(
        select(Tenant)
        .join(User, User.tenant_id == Tenant.id)
        .where(User.id == user_id, Tenant.is_active == True)
    )
    return result.scalars().all()

# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(user_id: str, role: str, tenant_id: str, schema_name: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "tenant_id": tenant_id,
        "schema": schema_name,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes),
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

def create_refresh_token_str() -> str:
    return str(uuid.uuid4())

async def store_refresh_token(db: AsyncSession, user_id: uuid.UUID, token: str) -> None:
    rt = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(rt)
    await db.commit()

async def rotate_refresh_token(
    db: AsyncSession, old_token: str
) -> tuple[Optional[RefreshToken], Optional[str]]:
    """
    Validates old refresh token, invalidates it, issues a new one.
    Returns (old_token_record, new_token_string) or (None, None) if invalid.
    """
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == old_token)
    )
    rt = result.scalar_one_or_none()
    if not rt:
        return None, None
    if datetime.now(timezone.utc) > rt.expires_at.replace(tzinfo=timezone.utc):
        return None, None
    # Invalidate old token
    await db.delete(rt)
    # Issue new token
    new_token = create_refresh_token_str()
    await store_refresh_token(db, rt.user_id, new_token)
    return rt, new_token

async def invalidate_refresh_token(db: AsyncSession, token: str) -> None:
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == token)
    )
    rt = result.scalar_one_or_none()
    if rt:
        await db.delete(rt)
        await db.commit()

def decode_access_token(token: str) -> dict:
    """Decode and validate JWT. Raises HTTPException on failure."""
    from fastapi import HTTPException, status
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
