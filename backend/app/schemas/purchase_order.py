"""
Purchase Order request/response schemas.
"""
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date


POStatus = Literal["draft", "pending", "approved", "rejected", "delivered"]


class PurchaseOrderResponse(BaseModel):
    id: str
    supplier_name: str
    item_id: str
    item_name: str
    quantity: float
    unit: str
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    expected_date: Optional[date] = None
    status: POStatus
    notes: Optional[str] = None
    created_by: str
    approved_by: Optional[str] = None
    date_label: str                       # human-friendly "Today" / "Yesterday" / ISO date


class PurchaseOrderCreate(BaseModel):
    supplier_name: str
    item_id: str
    quantity: float
    expected_date: Optional[date] = None
    notes: Optional[str] = None


class PurchaseOrderApproveReject(BaseModel):
    action: Literal["approved", "rejected"]
    notes: Optional[str] = None


class ReceiveDeliveryRequest(BaseModel):
    received_quantity: float
    invoice_s3_key: Optional[str] = None
    notes: Optional[str] = None
