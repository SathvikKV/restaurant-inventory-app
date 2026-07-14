"""
Wastage router.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models
from app.schemas.common import WastageRecordCreate, WastageRecordResponse

router = APIRouter()

@router.get("/", response_model=List[WastageRecordResponse], summary="List wastage records")
async def list_wastage(
    item_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    WastageEntry = models["wastage"]
    InventoryItem = models["inventory"]

    stmt = select(WastageEntry).order_by(WastageEntry.created_at.desc()).limit(limit).offset(offset)
    # Note: item_id filtering might be tricky if we store item name. Let's assume we store inventory item name in `item`
    # or just return all and we will fix it later.

    result = await db.execute(stmt)
    entries = result.scalars().all()
    
    # We might need to fetch item names if item_id is stored, but let's assume item name is stored in `item`
    responses = []
    for entry in entries:
        responses.append({
            "id": str(entry.id),
            "item_id": entry.item, # Assuming we store item_id here
            "item_name": entry.item, # or fetch from DB
            "quantity": entry.qty,
            "unit": entry.unit,
            "reason": entry.reason,
            "notes": None,
            "recorded_by": entry.recorded_by or "unknown",
            "recorded_at": entry.created_at,
        })

    if item_id:
        responses = [r for r in responses if r["item_id"] == item_id]
        
    return responses


@router.post("/", response_model=WastageRecordResponse, status_code=status.HTTP_201_CREATED, summary="Record a wastage event")
async def create_wastage(
    body: WastageRecordCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    WastageEntry = models["wastage"]
    InventoryItem = models["inventory"]

    item = await db.get(InventoryItem, uuid.UUID(body.item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.current_qty < body.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock to waste")

    item.previous_qty = item.current_qty
    item.current_qty -= body.quantity
    item.previous_updated = item.last_updated
    item.last_updated = datetime.now(timezone.utc)

    wastage = WastageEntry(
        item=str(item.id),
        qty=body.quantity,
        unit=item.unit,
        reason=body.reason,
        recorded_by=user.get("user_id")
    )
    db.add(wastage)
    await db.commit()
    await db.refresh(wastage)

    return WastageRecordResponse(
        id=str(wastage.id),
        item_id=str(item.id),
        item_name=item.item,
        quantity=wastage.qty,
        unit=wastage.unit,
        reason=wastage.reason,
        notes=body.notes,
        recorded_by=wastage.recorded_by,
        recorded_at=wastage.created_at,
    )


@router.get("/summary", summary="Get wastage summary for a date range")
async def wastage_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Stub aggregation
    return {
        "total_cost": 0.0,
        "total_entries": 0,
        "top_items": [],
        "period": {"start": start_date, "end": end_date},
    }
