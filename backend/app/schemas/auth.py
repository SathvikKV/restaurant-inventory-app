from pydantic import BaseModel
from typing import Optional

class SendOTPRequest(BaseModel):
    phone: str

class SendOTPResponse(BaseModel):
    message: str
    expires_in_seconds: int = 300
    mock_otp: Optional[str] = None

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: str
    schema: str
    user_id: str
    user_name: str
    needs_restaurant_selection: bool = False

class SelectRestaurantRequest(BaseModel):
    restaurant_id: str

class UserMeResponse(BaseModel):
    id: str
    name: str
    phone: str
    role: str
    tenant_id: str
    is_active: bool
