"""
Inventory router — CRUD + stock movements.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models
from app.schemas.inventory import (
    InventoryItemResponse, InventoryItemCreate, InventoryItemUpdate,
    StockAdjustRequest, StockIssueRequest, StockReceiveRequest,
)

router = APIRouter()

def _map_item_response(db_item) -> dict:
    qty = float(db_item.current_qty)
    threshold = float(db_item.reorder_threshold)
    status_val = "healthy"
    if qty <= threshold * 0.5:
        status_val = "critical"
    elif qty <= threshold:
        status_val = "low"
        
    return {
        "id": str(db_item.id),
        "name": db_item.item,
        "category": db_item.category or "Other",
        "quantity": qty,
        "unit": db_item.unit,
        "days_remaining": 0.0, # Computed fields omitted for MVP
        "status": status_val,
        "avg_daily_usage": 0.0,
        "week_usage": 0.0,
        "suggested_purchase": max(0.0, threshold - qty),
        "suppliers": [],
        "price_history": []
    }

@router.get("/", response_model=List[InventoryItemResponse], summary="List all inventory items")
async def list_inventory(
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    stmt = select(InventoryItem)
    if category:
        stmt = stmt.where(InventoryItem.category == category)
    if q:
        stmt = stmt.where(InventoryItem.item.ilike(f"%{q}%"))

    result = await db.execute(stmt)
    items = result.scalars().all()
    
    response_items = [_map_item_response(i) for i in items]
    if status_filter:
        response_items = [i for i in response_items if i["status"] == status_filter]
        
    return response_items


@router.get("/{item_id}", response_model=InventoryItemResponse, summary="Get a single inventory item")
async def get_inventory_item(
    item_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    item = await db.get(InventoryItem, uuid.UUID(item_id))
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    
    return _map_item_response(item)


@router.post("/", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED, summary="Create a new inventory item")
async def create_inventory_item(
    body: InventoryItemCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    new_item = InventoryItem(
        item=body.item,
        unit=body.unit,
        category=body.category,
        reorder_threshold=body.reorder_threshold,
        current_qty=0.0
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return _map_item_response(new_item)


@router.patch("/{item_id}", response_model=InventoryItemResponse, summary="Update an inventory item")
async def update_inventory_item(
    item_id: str,
    body: InventoryItemUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    item = await db.get(InventoryItem, uuid.UUID(item_id))
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    if body.item is not None:
        item.item = body.item
    if body.category is not None:
        item.category = body.category
    if body.reorder_threshold is not None:
        item.reorder_threshold = body.reorder_threshold

    item.last_updated = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return _map_item_response(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an item")
async def delete_inventory_item(
    item_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    item = await db.get(InventoryItem, uuid.UUID(item_id))
    if item:
        await db.delete(item)
        await db.commit()
    return None


@router.post("/{item_id}/receive", summary="Receive stock (increases quantity)")
async def receive_stock(
    item_id: str,
    body: StockReceiveRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    item = await db.get(InventoryItem, uuid.UUID(item_id))
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    item.previous_qty = item.current_qty
    item.current_qty += body.quantity
    item.previous_updated = item.last_updated
    item.last_updated = datetime.now(timezone.utc)

    await db.commit()
    return {"message": f"Received {body.quantity} units for item {item.item}"}


@router.post("/{item_id}/issue", summary="Issue stock to kitchen/bar (decreases quantity)")
async def issue_stock(
    item_id: str,
    body: StockIssueRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]
    Issue = models["issues"]

    item = await db.get(InventoryItem, uuid.UUID(item_id))
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    if item.current_qty < body.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    item.previous_qty = item.current_qty
    item.current_qty -= body.quantity
    item.previous_updated = item.last_updated
    item.last_updated = datetime.now(timezone.utc)

    new_issue = Issue(
        outlet=body.destination,
        items={item.item: body.quantity},
        recorded_by=user.get("user_id"),
    )
    db.add(new_issue)
    
    await db.commit()
    return {"message": f"Issued {body.quantity} units of item {item.item} to {body.destination}"}


@router.post("/{item_id}/adjust", summary="Adjust stock count (stock-take correction)")
async def adjust_stock(
    item_id: str,
    body: StockAdjustRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    item = await db.get(InventoryItem, uuid.UUID(item_id))
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    item.previous_qty = item.current_qty
    item.current_qty = body.new_quantity
    item.previous_updated = item.last_updated
    item.last_updated = datetime.now(timezone.utc)

    await db.commit()
    return {"message": f"Stock for item {item.item} adjusted to {body.new_quantity}"}


@router.get("/{item_id}/transactions", summary="Get transaction history for an item")
async def get_item_transactions(
    item_id: str,
    limit: int = 20,
    offset: int = 0,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return {"item_id": item_id, "transactions": [], "total": 0}
