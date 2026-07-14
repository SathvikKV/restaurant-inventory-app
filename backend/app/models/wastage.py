"""
Pydantic models (DB-layer shapes) for Wastage records.
Placeholder — replace with SQLAlchemy ORM models when DB is wired up.
"""
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


WastageReason = Literal["Spoiled", "Expired", "Overcooked", "Damaged", "Spillage", "Other"]


class WastageRecord(BaseModel):
    """Represents a single wastage entry."""
    id: str
    restaurant_id: str
    item_id: str
    item_name: str
    quantity: float
    unit: str
    reason: WastageReason
    notes: Optional[str] = None
    recorded_by: str                 # user id
    recorded_at: datetime
