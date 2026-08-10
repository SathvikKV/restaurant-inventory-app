"""
Inventory request/response schemas.
"""
from pydantic import BaseModel
from typing import Optional, List, Literal


Category = Literal["produce", "proteins", "dairy", "dry goods", "beverages", "bakery", "packaging", "cleaning", "misc"]
ItemStatus = Literal["critical", "low", "healthy"]


class SupplierPrice(BaseModel):
    name: str
    price: int
    best: bool = False


class PriceHistoryPoint(BaseModel):
    day: str
    price: int


class InventoryItemResponse(BaseModel):
    id: str
    name: str
    category: Category
    quantity: float
    unit: str
    days_remaining: float | None = None
    status: ItemStatus
    avg_daily_usage: float | None = None
    week_usage: float | None = None
    suggested_purchase: float
    avg_price_per_unit: float | None = None
    stock_value: float | None = None
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
