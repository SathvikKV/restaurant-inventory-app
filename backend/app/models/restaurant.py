"""
Pydantic models (DB-layer shapes) for Restaurant.
Placeholder — replace with SQLAlchemy ORM models when DB is wired up.
"""
from pydantic import BaseModel
from typing import Optional


class Restaurant(BaseModel):
    """Represents a single restaurant location."""
    id: str
    name: str
    area: str
    city: str
    owner_id: Optional[str] = None
    is_active: bool = True
