"""
Pydantic models (DB-layer shapes) for InventoryItem.
Placeholder — replace with SQLAlchemy ORM models when DB is wired up.
"""
from pydantic import BaseModel
from typing import Optional, Literal


Category = Literal["Veg", "Non-Veg", "Dairy", "Oil", "Grains", "Beverages", "Other"]
ItemStatus = Literal["critical", "low", "healthy"]


class InventoryItem(BaseModel):
    """Represents one SKU tracked in the inventory."""
    id: str
    restaurant_id: str
    name: str
    category: Category
    quantity: float
    unit: str                        # "kg" | "L" | "pcs" etc.
    reorder_level: float             # quantity below which status → "low"
    critical_level: float            # quantity below which status → "critical"
    avg_daily_usage: float = 0.0
    status: ItemStatus = "healthy"
    is_active: bool = True
    notes: Optional[str] = None
