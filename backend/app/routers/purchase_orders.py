"""
Purchase Orders router.
"""
import uuid
from datetime import datetime, timezone, date
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models
from app.schemas.purchase_order import (
    PurchaseOrderResponse, PurchaseOrderCreate,
    PurchaseOrderApproveReject, ReceiveDeliveryRequest,
)
from app.services.s3_service import get_s3_presigned_url

router = APIRouter()

def _map_po_response(po_entry) -> dict:
    is_list = isinstance(po_entry.items, list)
    items = po_entry.items if isinstance(po_entry.items, dict) else {}

    item_name = items.get("item_name", "Unknown Item")
    total_amount = float(items.get("total_amount", 0)) if "total_amount" in items and items.get("total_amount") is not None else None
    quantity = float(items.get("quantity", 0)) if "quantity" in items and items.get("quantity") is not None else None
    unit = items.get("unit")
    unit_price = float(items.get("unit_price", 0)) if "unit_price" in items and items.get("unit_price") is not None else None

    if is_list:
        line_items = [i for i in po_entry.items if isinstance(i, dict)]
        total_amount = sum(float(i.get("total_price") or 0) for i in line_items)
        if len(line_items) == 1:
            item_name = line_items[0].get("item_name") or "Unknown Item"
            quantity = float(line_items[0].get("quantity", 0)) if line_items[0].get("quantity") is not None else None
            unit = line_items[0].get("unit")
            unit_price = float(line_items[0].get("unit_price", 0)) if line_items[0].get("unit_price") is not None else None
        else:
            item_name = f"{len(line_items)} items" if line_items else "Multiple Items"
            quantity = None  # doesn't make sense as a single number across mixed line items
            unit = None

    return {
        "id": str(po_entry.id),
        "supplier_name": po_entry.supplier or "Unknown",
        "item_id": items.get("item_id", ""),
        "item_name": item_name,
        "quantity": quantity,
        "unit": unit,
        "unit_price": unit_price,
        "total_amount": total_amount,
        "expected_date": items.get("expected_date"),
        "status": po_entry.status,
        "notes": items.get("notes"),
        "created_by": po_entry.recorded_by or "",
        "approved_by": items.get("approved_by"),
        "date_label": po_entry.created_at.strftime("%d %b %Y") if po_entry.created_at else "Unknown",
        "image_url": get_s3_presigned_url(getattr(po_entry, "s3_key", None)),
        "items": po_entry.items or [],
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

class OCRLineItemIn(BaseModel):
    item_name: str
    quantity: float
    unit: str
    unit_price: Optional[float] = None
    total_price: Optional[float] = None

class SaveOCRInvoiceRequest(BaseModel):
    supplier_name: Optional[str] = None
    invoice_date: Optional[str] = None
    line_items: List[OCRLineItemIn]
    total_amount: Optional[float] = None
    invoice_s3_key: Optional[str] = None


@router.post("/from-ocr", summary="Save an OCR-extracted invoice, update inventory, and sync to Mise")
async def create_purchase_from_ocr(
    body: SaveOCRInvoiceRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]
    Purchase = models["purchases"]

    from app.models.public import User
    user_record = await db.get(User, uuid.UUID(user["user_id"]))
    recorded_by_name = getattr(user_record, "name", None) if user_record else user["user_id"]
    if not recorded_by_name:
        recorded_by_name = user["user_id"]

    new_items_created = []
    sync_calls = []

    for line in body.line_items:
        result = await db.execute(
            select(InventoryItem).where(func.lower(InventoryItem.item) == line.item_name.strip().lower())
        )
        item = result.scalar_one_or_none()
        if item:
            item.previous_qty = item.current_qty
            item.current_qty += line.quantity
            item.previous_updated = item.last_updated
            item.last_updated = datetime.now(timezone.utc)
            resolved_unit = item.unit
        else:
            # Simplification for v1: auto-create unmatched items rather than
            # building a fuzzy-match/confirmation UI right now (mirrors Mise's
            # own zone-3 auto-create behavior for unmatched names).
            db.add(InventoryItem(
                item=line.item_name, unit=line.unit, current_qty=line.quantity,
                previous_qty=0.0, reorder_threshold=0.0, category="misc",
                last_updated=datetime.now(timezone.utc),
            ))
            new_items_created.append(line.item_name)
            resolved_unit = line.unit
        sync_calls.append({"item_name": line.item_name, "quantity": line.quantity, "unit": resolved_unit})

    db.add(Purchase(
        supplier=body.supplier_name or "Unknown",
        items=[item.dict() for item in body.line_items],
        recorded_by=recorded_by_name,
        s3_key=body.invoice_s3_key,
        status="active",
        source="mobile_ocr",
    ))
    await db.commit()

    import asyncio
    from app.services.mise_writeback import push_to_mise
    for call in sync_calls:
        asyncio.create_task(push_to_mise(
            action="receive", item_name=call["item_name"], quantity=call["quantity"],
            unit=call["unit"], recorded_by=recorded_by_name, supplier=body.supplier_name or "Kosh App"
        ))

    return {"status": "ok", "new_items_created": new_items_created}
