from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth_service import decode_access_token
import logging

logger = logging.getLogger("app.auth")
security = HTTPBearer()

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    logger.info(f"[AUTH] {request.method} {request.url.path} - scheme={credentials.scheme}, token_prefix={credentials.credentials[:20] if credentials.credentials else 'EMPTY'}...")
    try:
        payload = decode_access_token(credentials.credentials)
        logger.info(f"[AUTH] Token decoded successfully for user {payload.get('sub')}")
        return {
            "user_id": payload["sub"],
            "role": payload["role"],
            "tenant_id": payload.get("tenant_id", ""),
            "schema": payload.get("schema", ""),
        }
    except Exception as e:
        logger.error(f"[AUTH] Token decode failed: {type(e).__name__}: {e}")
        raise

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
