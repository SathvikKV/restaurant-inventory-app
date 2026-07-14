"""
Inventory request/response schemas.
"""
from pydantic import BaseModel
from typing import Optional, List, Literal


Category = Literal["Veg", "Non-Veg", "Dairy", "Oil", "Grains", "Beverages", "Other"]
ItemStatus = Literal["critical", "low", "healthy"]


class SupplierPrice(BaseModel):
    name: str
    price: float
    best: bool = False


class PriceHistoryPoint(BaseModel):
    day: str
    price: float


class InventoryItemResponse(BaseModel):
    id: str
    name: str
    category: Category
    quantity: float
    unit: str
    days_remaining: float
    status: ItemStatus
    avg_daily_usage: float
    week_usage: float
    suggested_purchase: float
    suppliers: List[SupplierPrice] = []
    price_history: List[PriceHistoryPoint] = []


class InventoryItemCreate(BaseModel):
    item: str
    unit: str
    current_qty: float = 0.0
    reorder_threshold: float = 0.0
    category: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    item: Optional[str] = None
    unit: Optional[str] = None
    reorder_threshold: Optional[float] = None
    category: Optional[str] = None


class StockAdjustRequest(BaseModel):
    new_quantity: float
    reason: str


class StockIssueRequest(BaseModel):
    quantity: float
    destination: str          # "Kitchen" | "Bar" | etc.
    notes: Optional[str] = None


class StockReceiveRequest(BaseModel):
    quantity: float
    purchase_order_id: Optional[str] = None
    invoice_s3_key: Optional[str] = None
    notes: Optional[str] = None
