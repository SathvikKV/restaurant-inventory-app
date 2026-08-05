import hmac
from fastapi import Header, HTTPException
from app.config import get_settings

settings = get_settings()

async def verify_mise_service_token(x_mise_service_token: str = Header(None)):
    if not x_mise_service_token or not settings.mise_service_secret or not hmac.compare_digest(x_mise_service_token, settings.mise_service_secret):
        raise HTTPException(status_code=403, detail="Invalid or missing service token")
