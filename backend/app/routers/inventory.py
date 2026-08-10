"""
Inventory router — CRUD + stock movements.
"""
import uuid
import re
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models
from app.services.embeddings import get_embedding
from app.services.transaction_log import log_transaction
from app.services.s3_service import get_s3_presigned_url
from app.services.units import normalize_to_base, to_display_pair
from app.schemas.inventory import (
    InventoryItemResponse, InventoryItemCreate, InventoryItemUpdate,
    StockAdjustRequest, StockIssueRequest, StockReceiveRequest,
)
from app.models.public import User
from pydantic import BaseModel

class MenuIngredient(BaseModel):
    name: str
    unit: str
    category: str

class BulkIngredientCreate(BaseModel):
    ingredients: List[MenuIngredient]

router = APIRouter()

def _map_item_response(db_item, avg_daily_usage: Optional[float] = None, runway: Optional[float] = None,
                       avg_price_per_unit: Optional[float] = None, stock_value: Optional[float] = None) -> dict:
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
        "category": db_item.category or "misc",
        "quantity": qty,
        "unit": db_item.unit,
        "days_remaining": runway,
        "status": status_val,
        "avg_daily_usage": avg_daily_usage,
        "week_usage": None,
        "suggested_purchase": max(0.0, threshold - qty),
        "avg_price_per_unit": avg_price_per_unit,
        "stock_value": stock_value,
        "suppliers": [],
        "price_history": []
    }

@router.post("/backfill-embeddings")
async def backfill_embeddings(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]
    result = await db.execute(select(InventoryItem).where(InventoryItem.embedding.is_(None)))
    items = result.scalars().all()
    for item in items:
        item.embedding = await asyncio.to_thread(get_embedding, item.item)
    await db.commit()
    return {"backfilled": len(items)}


@router.post("/bulk-create", summary="Bulk-create inventory items from reviewed menu extraction")
async def bulk_create_inventory(body: BulkIngredientCreate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]
    
    from app.models.public import User, Tenant
    import uuid
    user_record = await db.get(User, uuid.UUID(user["user_id"]))
    tenant_record = await db.get(Tenant, user_record.tenant_id) if user_record and user_record.tenant_id else None
    spreadsheet_id = tenant_record.spreadsheet_id if tenant_record else None
    
    recorded_by_name = getattr(user_record, "name", None) if user_record else user["user_id"]
    if not recorded_by_name:
        recorded_by_name = user["user_id"]

    from app.services.mise_writeback import push_to_mise

    created = []
    for ing in body.ingredients:
        _, norm_unit = normalize_to_base(0.0, ing.unit)
        item = InventoryItem(
            item=ing.name, 
            unit=norm_unit, 
            current_qty=0.0, 
            previous_qty=0.0, 
            reorder_threshold=0.0, 
            category=ing.category, 
            last_updated=datetime.now(timezone.utc),
            embedding=await asyncio.to_thread(get_embedding, ing.name)
        )
        db.add(item)
        created.append(ing.name)
        
        disp_qty, disp_unit = to_display_pair(0.0, norm_unit)
        asyncio.create_task(push_to_mise(
            action="adjust", item_name=ing.name, quantity=disp_qty,
            unit=disp_unit, recorded_by=recorded_by_name, reason="Initial Menu Extraction",
            spreadsheet_id=spreadsheet_id
        ))
        
    await db.commit()
    return {"status": "ok", "items_created": len(created)}

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

    stmt = select(InventoryItem).order_by(InventoryItem.item)
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
        
    InventoryTransaction = models["inventory_transactions"]
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    from sqlalchemy import func
    
    result = await db.execute(
        select(func.sum(InventoryTransaction.quantity_delta))
        .where(
            InventoryTransaction.item_id == item.id,
            InventoryTransaction.action.in_(['issue', 'waste']),
            InventoryTransaction.created_at >= cutoff
        )
    )
    total_consumed = result.scalar()
    
    avg_daily_usage = None
    runway = None
    if total_consumed is not None and total_consumed < 0:
        avg_daily_usage = abs(total_consumed) / 14.0
        if avg_daily_usage > 0:
            runway = max(0.0, item.current_qty) / avg_daily_usage
            
    avg_price_per_unit = None
    stock_value = None
    if getattr(item, 'avg_price_per_base_unit', None) is not None:
        from app.services.units import to_display_pair
        disp_qty, _ = to_display_pair(1.0, item.unit)
        if disp_qty > 0:
            avg_price_per_unit = (item.avg_price_per_base_unit / disp_qty) / 100.0
            
        stock_value = (item.current_qty * item.avg_price_per_base_unit) / 100.0

    return _map_item_response(
        item,
        avg_daily_usage=avg_daily_usage,
        runway=runway,
        avg_price_per_unit=avg_price_per_unit,
        stock_value=stock_value
    )


@router.patch("/{item_id}", response_model=InventoryItemResponse, summary="Update an inventory item")
async def update_inventory_item(
    item_id: str,
    update_data: InventoryItemUpdate,
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
        raise HTTPException(status_code=404, detail="Item not found")
        
    if update_data.item is not None:
        item.item = update_data.item
    if update_data.unit is not None:
        item.unit = update_data.unit
    if update_data.reorder_threshold is not None:
        item.reorder_threshold = update_data.reorder_threshold
    if update_data.category is not None:
        item.category = update_data.category

    item.last_updated = datetime.now(timezone.utc)
    
    await db.commit()
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

    _, norm_unit = normalize_to_base(0.0, body.unit)
    new_item = InventoryItem(
        item=body.item,
        unit=norm_unit,
        category=body.category,
        reorder_threshold=body.reorder_threshold,
        current_qty=0.0,
        embedding=await asyncio.to_thread(get_embedding, body.item)
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

    from app.models.public import User, Tenant
    user_record = await db.get(User, uuid.UUID(user["user_id"]))
    tenant_record = await db.get(Tenant, user_record.tenant_id) if user_record and user_record.tenant_id else None
    spreadsheet_id = tenant_record.spreadsheet_id if tenant_record else None
    
    recorded_by_name = getattr(user_record, "name", None) if user_record else user["user_id"]
    if not recorded_by_name:
        recorded_by_name = user["user_id"]

    norm_qty, norm_unit = normalize_to_base(body.quantity, item.unit)
    item.unit = norm_unit
    item.previous_qty = item.current_qty
    item.current_qty += norm_qty
    item.previous_updated = item.last_updated
    item.last_updated = datetime.now(timezone.utc)

    await log_transaction(
        db, models, item_id=item.id, item_name=item.item, action="receive",
        quantity_delta=norm_qty, resulting_qty=item.current_qty, unit=norm_unit,
        recorded_by=recorded_by_name
    )
    await db.commit()
    
    from app.services.mise_writeback import push_to_mise
    disp_qty, disp_unit = to_display_pair(norm_qty, norm_unit)
    asyncio.create_task(push_to_mise(
        action="receive", item_name=item.item, quantity=disp_qty,
        unit=disp_unit, recorded_by=recorded_by_name, supplier="Kosh App",
        spreadsheet_id=spreadsheet_id
    ))
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

    from app.models.public import User, Tenant
    user_record = await db.get(User, uuid.UUID(user["user_id"]))
    tenant_record = await db.get(Tenant, user_record.tenant_id) if user_record and user_record.tenant_id else None
    spreadsheet_id = tenant_record.spreadsheet_id if tenant_record else None
    
    recorded_by_name = getattr(user_record, "name", None) if user_record else user["user_id"]
    if not recorded_by_name:
        recorded_by_name = user["user_id"]

    norm_qty, norm_unit = normalize_to_base(body.quantity, item.unit)
    item.unit = norm_unit
    item.previous_qty = item.current_qty
    item.current_qty -= norm_qty
    item.previous_updated = item.last_updated
    item.last_updated = datetime.now(timezone.utc)

    new_issue = Issue(
        outlet=body.destination,
        items={item.item: norm_qty},
        recorded_by=recorded_by_name,
    )
    db.add(new_issue)
    
    await log_transaction(
        db, models, item_id=item.id, item_name=item.item, action="issue",
        quantity_delta=-norm_qty, resulting_qty=item.current_qty, unit=norm_unit,
        recorded_by=recorded_by_name, notes=body.destination
    )
    await db.commit()
    
    from app.services.mise_writeback import push_to_mise
    disp_qty, disp_unit = to_display_pair(norm_qty, norm_unit)
    asyncio.create_task(push_to_mise(
        action="issue", item_name=item.item, quantity=disp_qty,
        unit=disp_unit, recorded_by=recorded_by_name, destination=body.destination,
        spreadsheet_id=spreadsheet_id
    ))
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

    from app.models.public import User, Tenant
    user_record = await db.get(User, uuid.UUID(user["user_id"]))
    tenant_record = await db.get(Tenant, user_record.tenant_id) if user_record and user_record.tenant_id else None
    spreadsheet_id = tenant_record.spreadsheet_id if tenant_record else None
    
    recorded_by_name = getattr(user_record, "name", None) if user_record else user["user_id"]
    if not recorded_by_name:
        recorded_by_name = user["user_id"]

    norm_qty, norm_unit = normalize_to_base(body.new_quantity, item.unit)
    item.unit = norm_unit
    item.previous_qty = item.current_qty
    item.current_qty = norm_qty
    item.previous_updated = item.last_updated
    item.last_updated = datetime.now(timezone.utc)

    delta = norm_qty - item.previous_qty
    await log_transaction(
        db, models, item_id=item.id, item_name=item.item, action="adjust",
        quantity_delta=delta, resulting_qty=item.current_qty, unit=norm_unit,
        recorded_by=recorded_by_name, notes=body.reason
    )
    await db.commit()
    
    from app.services.mise_writeback import push_to_mise
    disp_qty, disp_unit = to_display_pair(norm_qty, norm_unit)
    asyncio.create_task(push_to_mise(
        action="adjust", item_name=item.item, quantity=disp_qty,
        unit=disp_unit, recorded_by=recorded_by_name, reason=body.reason,
        spreadsheet_id=spreadsheet_id
    ))
    return {"message": f"Adjusted item {item.item} to {body.new_quantity}"}


@router.get("/{item_id}/transactions", summary="Get transaction history for an item")
async def get_item_transactions(
    item_id: str,
    limit: int = 20,
    offset: int = 0,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return {"item_id": item_id, "transactions": [], "total": 0}


UUID_PATTERN = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)

async def resolve_history_image_url(source_reference: Optional[str], models, db) -> Optional[str]:
    if not source_reference:
        return None
    if UUID_PATTERN.match(source_reference):
        try:
            Purchase = models["purchases"]
            purchase = await db.get(Purchase, uuid.UUID(source_reference))
            if purchase and getattr(purchase, "s3_key", None):
                return get_s3_presigned_url(purchase.s3_key)
        except Exception:
            pass
        try:
            Issue = models["issues"]
            issue = await db.get(Issue, uuid.UUID(source_reference))
            if issue and getattr(issue, "s3_key", None):
                return get_s3_presigned_url(issue.s3_key)
        except Exception:
            pass
        return None
    if " " in source_reference and not source_reference.startswith("http"):
        return None
    if "/" in source_reference or source_reference.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.pdf')) or source_reference.startswith("http"):
        return get_s3_presigned_url(source_reference)
    return None


async def get_tenant_users_map(tenant_id_str: Optional[str], db: AsyncSession) -> dict:
    users_map = {"by_id": {}, "by_name": {}}
    if not tenant_id_str:
        return users_map
    try:
        t_uuid = uuid.UUID(tenant_id_str)
        res = await db.execute(select(User).where(User.tenant_id == t_uuid))
        for u in res.scalars().all():
            users_map["by_id"][str(u.id)] = u
            if u.name:
                users_map["by_name"][u.name.lower().strip()] = u
            if u.phone:
                users_map["by_name"][u.phone] = u
    except Exception:
        pass
    return users_map

def resolve_actor_info(recorded_by: Optional[str], users_map: dict) -> tuple[str, str]:
    if not recorded_by or recorded_by.lower() in ("unknown", "none", ""):
        return "System (Auto)", "system"
    rec = recorded_by.strip()
    rec_lower = rec.lower()
    if any(w in rec_lower for w in ("system", "bot", "auto", "mise", "kosh")):
        return rec, "system"
    if rec in users_map["by_id"]:
        u = users_map["by_id"][rec]
        role_val = u.role.value if hasattr(u.role, 'value') else str(u.role)
        return (u.name or u.phone or ("Owner" if role_val == "owner" else "Manager")), role_val.lower()
    if rec_lower in users_map["by_name"]:
        u = users_map["by_name"][rec_lower]
        role_val = u.role.value if hasattr(u.role, 'value') else str(u.role)
        return (u.name or u.phone), role_val.lower()
    if len(rec) == 36 and "-" in rec:
        return "Team Member", "manager"
    return rec, "manager"


@router.get("/activity/all", summary="Tenant-wide chronological activity feed")
async def get_all_activity(
    action: Optional[str] = None, limit: int = 100, offset: int = 0,
    user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryTransaction = models["inventory_transactions"]
    stmt = select(InventoryTransaction).order_by(InventoryTransaction.created_at.desc())
    if action:
        stmt = stmt.where(InventoryTransaction.action == action)
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    
    users_map = await get_tenant_users_map(user.get("tenant_id"), db)
    out = []
    for r in rows:
        image_url = await resolve_history_image_url(r.source_reference, models, db)
        actor_name, actor_type = resolve_actor_info(r.recorded_by, users_map)
        out.append({
            "id": str(r.id), "item_name": r.item_name, "action": r.action,
            "quantity_delta": r.quantity_delta, "resulting_qty": r.resulting_qty, "unit": r.unit,
            "notes": r.notes, "recorded_by": actor_name, "actor_type": actor_type, "image_url": image_url,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        })
    return out


@router.get("/{item_id}/history", summary="Chronological transaction history for one item")
async def get_item_history(
    item_id: str,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    InventoryTransaction = models["inventory_transactions"]
    result = await db.execute(
        select(InventoryTransaction)
        .where(InventoryTransaction.item_id == uuid.UUID(item_id))
        .order_by(InventoryTransaction.created_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    users_map = await get_tenant_users_map(user.get("tenant_id"), db)
    out = []
    for r in rows:
        image_url = await resolve_history_image_url(r.source_reference, models, db)
        actor_name, actor_type = resolve_actor_info(r.recorded_by, users_map)
        out.append({
            "id": str(r.id),
            "action": r.action,
            "quantity_delta": r.quantity_delta,
            "resulting_qty": r.resulting_qty,
            "unit": r.unit,
            "recorded_by": actor_name,
            "actor_type": actor_type,
            "notes": r.notes,
            "source_reference": r.source_reference,
            "image_url": image_url,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        })
    return out

