from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth_service import decode_access_token

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validates Bearer JWT and returns claims dict with:
    user_id, role, tenant_id, schema
    """
    payload = decode_access_token(credentials.credentials)
    return {
        "user_id": payload["sub"],
        "role": payload["role"],
        "tenant_id": payload.get("tenant_id", ""),
        "schema": payload.get("schema", ""),
    }

async def require_owner(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can perform this action.",
        )
    return user

async def require_manager_or_owner(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("owner", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        )
    return user
