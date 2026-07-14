"""
Pydantic models (DB-layer shapes) for User.
Placeholder — replace with SQLAlchemy ORM models when DB is wired up.
"""
from pydantic import BaseModel
from typing import Optional, Literal


Role = Literal["owner", "manager", "staff"]


class User(BaseModel):
    """Represents a Kosh user."""
    id: str
    name: str
    phone: str                           # E.164 format e.g. "+919876543210"
    role: Role = "staff"
    restaurant_id: str
    is_active: bool = True
    hashed_pin: Optional[str] = None     # Optional PIN auth (in addition to OTP)
