"""
Wastage and User request/response schemas.
"""
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


# ── Wastage ─────────────────────────────────────────────────────────────────

WastageReason = Literal["Spoiled", "Expired", "Overcooked", "Damaged", "Spillage", "Other"]


class WastageRecordCreate(BaseModel):
    item_id: str
    quantity: float
    reason: WastageReason
    notes: Optional[str] = None


class WastageRecordResponse(BaseModel):
    id: str
    item_id: str
    item_name: str
    quantity: float
    unit: str
    reason: WastageReason
    notes: Optional[str] = None
    recorded_by: str
    recorded_at: datetime


# ── Users ───────────────────────────────────────────────────────────────────

UserRole = Literal["owner", "manager", "staff"]


class UserResponse(BaseModel):
    id: str
    name: str
    phone: str
    role: UserRole
    restaurant_id: str
    is_active: bool


class UserCreate(BaseModel):
    name: str
    phone: str
    role: UserRole = "staff"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


# ── Restaurants ─────────────────────────────────────────────────────────────

class RestaurantResponse(BaseModel):
    id: str
    name: str
    area: str
    city: str
    is_active: bool


class RestaurantCreate(BaseModel):
    name: str
    area: str
    city: str


class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = None
