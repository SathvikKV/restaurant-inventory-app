from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db
from app.config import get_settings

router = APIRouter()
settings = get_settings()


class SyncInventoryItem(BaseModel):
    item: str
    unit: str
    current_qty: float
    previous_qty: float = 0.0
    reorder_threshold: float = 0.0
    category: Optional[str] = None
    last_updated: Optional[str] = None

class SyncPurchase(BaseModel):
    supplier: Optional[str]
    invoice_date: Optional[str]
    items: list
    recorded_by: Optional[str]
    s3_key: Optional[str]

class SyncPayload(BaseModel):
    schema_name: str
    inventory: List[SyncInventoryItem] = []
    purchases: List[SyncPurchase] = []

def _verify_sync_token(x_sync_token: str = Header(None)):
    """Simple shared-secret auth for Mise → Kosh sync calls."""
    expected = getattr(settings, 'sync_secret', '') or settings.secret_key
    if x_sync_token != expected:
        raise HTTPException(status_code=401, detail="Invalid sync token")

@router.post("/ingest", summary="Ingest data from Mise backend")
async def ingest_sync(
    payload: SyncPayload,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_sync_token),
):
    """
    Receives inventory and purchase data from Mise and upserts into Postgres.
    Called by Mise after every invoice/indent processing.
    """
    from app.services.tenant_registry import get_tenant_models

    try:
        models = get_tenant_models(payload.schema_name)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Unknown schema: {payload.schema_name}")

    InventoryItem = models["inventory"]
    Purchase = models["purchases"]

    # Upsert inventory items
    for sync_item in payload.inventory:
        result = await db.execute(
            select(InventoryItem).where(InventoryItem.item == sync_item.item)
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.current_qty = sync_item.current_qty
            existing.previous_qty = sync_item.previous_qty
            existing.unit = sync_item.unit
            existing.reorder_threshold = sync_item.reorder_threshold
            existing.last_updated = datetime.now(timezone.utc)
            if sync_item.category:
                existing.category = sync_item.category
        else:
            new_item = InventoryItem(
                item=sync_item.item,
                unit=sync_item.unit,
                current_qty=sync_item.current_qty,
                previous_qty=sync_item.previous_qty,
                reorder_threshold=sync_item.reorder_threshold,
                category=sync_item.category,
                last_updated=datetime.now(timezone.utc),
            )
            db.add(new_item)

    # Append purchases (no dedup for now)
    for sync_purchase in payload.purchases:
        purchase = Purchase(
            supplier=sync_purchase.supplier,
            items=sync_purchase.items,
            recorded_by=sync_purchase.recorded_by,
            s3_key=sync_purchase.s3_key,
            status="active",
            source="whatsapp",
        )
        db.add(purchase)

    await db.commit()
    return {
        "status": "ok",
        "inventory_upserted": len(payload.inventory),
        "purchases_added": len(payload.purchases),
    }
