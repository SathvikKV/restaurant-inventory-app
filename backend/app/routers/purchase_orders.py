"""
Purchase Orders router.
"""
import uuid
from datetime import datetime, timezone, date
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models
from app.schemas.purchase_order import (
    PurchaseOrderResponse, PurchaseOrderCreate,
    PurchaseOrderApproveReject, ReceiveDeliveryRequest,
)

router = APIRouter()

def _map_po_response(po_entry) -> dict:
    items = po_entry.items or {}
    return {
        "id": str(po_entry.id),
        "supplier_name": po_entry.supplier or "Unknown",
        "item_id": items.get("item_id", ""),
        "item_name": items.get("item_name", "Unknown Item"),
        "quantity": float(items.get("quantity", 0)),
        "unit": items.get("unit", "kg"),
        "unit_price": float(items.get("unit_price", 0)) if "unit_price" in items else None,
        "total_amount": float(items.get("total_amount", 0)) if "total_amount" in items else None,
        "expected_date": items.get("expected_date"),
        "status": po_entry.status,
        "notes": items.get("notes"),
        "created_by": po_entry.recorded_by or "",
        "approved_by": items.get("approved_by"),
        "date_label": po_entry.created_at.strftime("%d %b %Y") if po_entry.created_at else "Unknown",
    }


@router.get("/", response_model=List[PurchaseOrderResponse], summary="List purchase orders")
async def list_purchase_orders(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Purchase = models["purchases"]

    stmt = select(Purchase).order_by(Purchase.created_at.desc()).limit(limit).offset(offset)
    if status_filter:
        stmt = stmt.where(Purchase.status == status_filter)

    result = await db.execute(stmt)
    pos = result.scalars().all()
    
    return [_map_po_response(po) for po in pos]


@router.get("/{po_id}", response_model=PurchaseOrderResponse, summary="Get a single PO")
async def get_purchase_order(
    po_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Purchase = models["purchases"]

    po = await db.get(Purchase, uuid.UUID(po_id))
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    return _map_po_response(po)


@router.post("/", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED, summary="Create a new purchase order")
async def create_purchase_order(
    body: PurchaseOrderCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Purchase = models["purchases"]
    InventoryItem = models["inventory"]

    item = await db.get(InventoryItem, uuid.UUID(body.item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    new_po = Purchase(
        supplier=body.supplier_name,
        status="pending",
        recorded_by=user.get("user_id"),
        items={
            "item_id": str(item.id),
            "item_name": item.item,
            "quantity": body.quantity,
            "unit": item.unit,
            "expected_date": str(body.expected_date) if body.expected_date else None,
            "notes": body.notes,
        },
        source="app"
    )
    db.add(new_po)
    await db.commit()
    await db.refresh(new_po)

    return _map_po_response(new_po)


@router.post("/{po_id}/action", response_model=PurchaseOrderResponse, summary="Approve or reject a PO")
async def action_purchase_order(
    po_id: str,
    body: PurchaseOrderApproveReject,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Purchase = models["purchases"]

    po = await db.get(Purchase, uuid.UUID(po_id))
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")

    po.status = body.action
    items = dict(po.items)
    items["approved_by"] = user.get("user_id")
    if body.notes:
        items["action_notes"] = body.notes
    po.items = items

    await db.commit()
    await db.refresh(po)
    return _map_po_response(po)


@router.post("/{po_id}/receive", summary="Mark a PO as delivered and update stock")
async def receive_purchase_order(
    po_id: str,
    body: ReceiveDeliveryRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Purchase = models["purchases"]
    InventoryItem = models["inventory"]

    po = await db.get(Purchase, uuid.UUID(po_id))
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")

    po.status = "delivered"
    if body.invoice_s3_key:
        po.s3_key = body.invoice_s3_key
    
    item_id_str = po.items.get("item_id")
    if item_id_str:
        item = await db.get(InventoryItem, uuid.UUID(item_id_str))
        if item:
            item.previous_qty = item.current_qty
            item.current_qty += body.received_quantity
            item.previous_updated = item.last_updated
            item.last_updated = datetime.now(timezone.utc)
            
    await db.commit()
    return {"message": f"PO #{po_id} marked as delivered. Stock updated."}


@router.delete("/{po_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Cancel/delete a draft PO")
async def delete_purchase_order(
    po_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Purchase = models["purchases"]

    po = await db.get(Purchase, uuid.UUID(po_id))
    if po:
        if po.status not in ("draft", "rejected", "pending"):
            raise HTTPException(status_code=400, detail="Cannot delete an approved/delivered PO")
        await db.delete(po)
        await db.commit()
    return None
