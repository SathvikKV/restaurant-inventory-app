"""
Pydantic models (DB-layer shapes) for PurchaseOrder.
Placeholder — replace with SQLAlchemy ORM models when DB is wired up.
"""
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date


POStatus = Literal["draft", "pending", "approved", "rejected", "delivered"]


class PurchaseOrder(BaseModel):
    """Represents a purchase order raised for a supplier."""
    id: str
    restaurant_id: str
    supplier_name: str
    item_id: str
    item_name: str
    quantity: float
    unit: str
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    expected_date: Optional[date] = None
    status: POStatus = "pending"
    notes: Optional[str] = None
    created_by: str                  # user id
    approved_by: Optional[str] = None
    invoice_s3_key: Optional[str] = None   # S3 key of uploaded invoice photo


class PurchaseOrderLineItem(BaseModel):
    """A single line item within a multi-item PO (future use)."""
    item_id: str
    item_name: str
    quantity: float
    unit: str
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
