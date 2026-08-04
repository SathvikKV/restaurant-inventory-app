"""
Purchase Orders router.
"""
import uuid
import re
import asyncio
from datetime import datetime, timezone, date
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional, Dict, Literal

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models
from app.services.embeddings import get_embedding, cosine_similarity
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
    resolutions: Optional[Dict[str, dict]] = None

class PreviewLineItem(BaseModel):
    item_name: str
    quantity: float
    unit: str

class PreviewMatchResult(BaseModel):
    item_name: str
    quantity: float
    unit: str
    match_status: Literal["exact", "needs_review", "new"]
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None
    score: Optional[float] = None

class PreviewMatchRequest(BaseModel):
    line_items: List[PreviewLineItem]


async def _best_match_semantic(name: str, existing_items: list) -> tuple[Optional[object], float]:
    name_embedding = await asyncio.to_thread(get_embedding, name)
    best, best_score = None, 0.0
    for item in existing_items:
        if not item.embedding:
            item.embedding = await asyncio.to_thread(get_embedding, item.item)
        score = cosine_similarity(name_embedding, item.embedding)
        if score > best_score:
            best, best_score = item, score
    return best, best_score


@router.post("/preview-match", response_model=List[PreviewMatchResult], summary="Preview semantic matching for invoice items")
async def preview_match(body: PreviewMatchRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    inv_res = await db.execute(select(InventoryItem))
    existing_items = list(inv_res.scalars().all())

    results = []
    for line in body.line_items:
        best_item, score = await _best_match_semantic(line.item_name, existing_items)
        if score >= 0.95 and best_item:
            if best_item.unit.strip().lower() != line.unit.strip().lower():
                results.append(PreviewMatchResult(
                    item_name=line.item_name, quantity=line.quantity, unit=line.unit,
                    match_status="needs_review", candidate_id=str(best_item.id), candidate_name=best_item.item, score=score
                ))
            else:
                results.append(PreviewMatchResult(
                    item_name=line.item_name, quantity=line.quantity, unit=line.unit,
                    match_status="exact", candidate_id=str(best_item.id), candidate_name=best_item.item, score=score
                ))
        elif score >= 0.80 and best_item:
            results.append(PreviewMatchResult(
                item_name=line.item_name, quantity=line.quantity, unit=line.unit,
                match_status="needs_review", candidate_id=str(best_item.id), candidate_name=best_item.item, score=score
            ))
        else:
            results.append(PreviewMatchResult(
                item_name=line.item_name, quantity=line.quantity, unit=line.unit,
                match_status="new"
            ))
    await db.commit()
    return results


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
    PendingConfirmation = models["confirmations"]

    from app.models.public import User
    user_record = await db.get(User, uuid.UUID(user["user_id"]))
    recorded_by_name = getattr(user_record, "name", None) if user_record else user["user_id"]
    if not recorded_by_name:
        recorded_by_name = user["user_id"]

    new_items_created = []
    sync_calls = []

    inv_res = await db.execute(select(InventoryItem))
    existing_items = list(inv_res.scalars().all())

    resolutions = body.resolutions or {}
    for line in body.line_items:
        res = resolutions.get(line.item_name)
        if res is not None:
            if res.get("same") is True:
                target_id = res.get("target_item_id")
                target_item = None
                if target_id:
                    for item in existing_items:
                        if str(item.id) == str(target_id):
                            target_item = item
                            break
                if target_item:
                    target_item.previous_qty = target_item.current_qty
                    target_item.current_qty += line.quantity
                    target_item.previous_updated = target_item.last_updated
                    target_item.last_updated = datetime.now(timezone.utc)
                    sync_calls.append({"item_name": target_item.item, "quantity": line.quantity, "unit": target_item.unit})
                continue
            elif res.get("same") is False:
                new_inv = InventoryItem(
                    item=line.item_name, unit=line.unit, current_qty=line.quantity,
                    previous_qty=0.0, reorder_threshold=0.0, category="misc",
                    last_updated=datetime.now(timezone.utc),
                    embedding=await asyncio.to_thread(get_embedding, line.item_name),
                )
                db.add(new_inv)
                existing_items.append(new_inv)
                new_items_created.append(line.item_name)
                sync_calls.append({"item_name": line.item_name, "quantity": line.quantity, "unit": line.unit})
                continue

        best_item, score = await _best_match_semantic(line.item_name, existing_items)
        if score >= 0.95 and best_item:
            if best_item.unit.strip().lower() != line.unit.strip().lower():
                existing_pending = await db.execute(
                    select(PendingConfirmation).where(
                        PendingConfirmation.extracted_name == line.item_name,
                        PendingConfirmation.candidate_name == best_item.item,
                        PendingConfirmation.status == "pending",
                    )
                )
                if not existing_pending.scalar_one_or_none():
                    db.add(PendingConfirmation(
                        extracted_name=line.item_name, candidate_name=best_item.item,
                        score=score, quantity=line.quantity, unit=line.unit, source="app",
                    ))
                resolved_unit = line.unit
            else:
                best_item.previous_qty = best_item.current_qty
                best_item.current_qty += line.quantity
                best_item.previous_updated = best_item.last_updated
                best_item.last_updated = datetime.now(timezone.utc)
                resolved_unit = best_item.unit
                sync_calls.append({"item_name": best_item.item, "quantity": line.quantity, "unit": resolved_unit})
        elif score >= 0.80 and best_item:
            existing_pending = await db.execute(
                select(PendingConfirmation).where(
                    PendingConfirmation.extracted_name == line.item_name,
                    PendingConfirmation.candidate_name == best_item.item,
                    PendingConfirmation.status == "pending",
                )
            )
            if not existing_pending.scalar_one_or_none():
                db.add(PendingConfirmation(
                    extracted_name=line.item_name,
                    candidate_name=best_item.item,
                    score=score,
                    quantity=line.quantity,
                    unit=line.unit,
                    source="app",
                ))
            resolved_unit = line.unit
        else:
            new_inv = InventoryItem(
                item=line.item_name, unit=line.unit, current_qty=line.quantity,
                previous_qty=0.0, reorder_threshold=0.0, category="misc",
                last_updated=datetime.now(timezone.utc),
                embedding=await asyncio.to_thread(get_embedding, line.item_name),
            )
            db.add(new_inv)
            existing_items.append(new_inv)
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
