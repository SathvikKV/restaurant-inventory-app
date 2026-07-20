from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models, require_schema

router = APIRouter()


@router.get("/food-cost-trend", summary="Daily food cost trend (last N days)")
async def food_cost_trend(
    days: int = Query(7, ge=1, le=90),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns total purchase spend per day for the last N days.
    Reads from the tenant purchases table.
    """
    schema = require_schema(user)
    models = get_tenant_models(schema)
    Purchase = models["purchases"]

    since = datetime.now(timezone.utc) - timedelta(days=days)
    day_trunc = func.date_trunc('day', Purchase.created_at)
    stmt = (
        select(
            day_trunc.label("day"),
            func.count(Purchase.id).label("num_orders"),
        )
        .where(Purchase.created_at >= since)
        .group_by(day_trunc)
        .order_by(day_trunc)
    )
    result = await db.execute(stmt)
    rows = result.fetchall()
    return [
        {"day": row.day.strftime("%a %d %b") if row.day else "", "num_orders": row.num_orders}
        for row in rows
    ]


@router.get("/top-items")
async def top_items(
    limit: int = 5,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="No schema")
    
    models = get_tenant_models(schema)
    WastageEntry = models["wastage"]
    InventoryItem = models["inventory"]
    
    # Get top wasted items by quantity
    stmt = (
        select(
            WastageEntry.item.label("item_id"),
            func.sum(WastageEntry.qty).label("total_qty")
        )
        .group_by(WastageEntry.item)
        .order_by(func.sum(WastageEntry.qty).desc())
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Look up item names
    output = []
    for row in rows:
        item_name = row.item_id  # fallback to ID
        try:
            import uuid as _uuid
            inv_item = await db.get(InventoryItem, _uuid.UUID(str(row.item_id)))
            if inv_item:
                item_name = inv_item.item
        except Exception:
            pass
        output.append({
            "item": item_name,
            "total_qty": float(row.total_qty or 0)
        })
    
    return output


@router.get("/wastage-summary", summary="Wastage summary for a period")
async def wastage_summary(
    days: int = Query(7, ge=1, le=90),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    schema = require_schema(user)
    models = get_tenant_models(schema)
    WastageEntry = models["wastage"]

    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            WastageEntry.item,
            WastageEntry.unit,
            func.sum(WastageEntry.qty).label("total_qty"),
        )
        .where(WastageEntry.created_at >= since)
        .group_by(WastageEntry.item, WastageEntry.unit)
        .order_by(func.sum(WastageEntry.qty).desc())
    )
    rows = result.fetchall()
    return {
        "period_days": days,
        "top_items": [
            {"item": r.item, "unit": r.unit, "total_qty": r.total_qty}
            for r in rows
        ],
    }


@router.get("/purchases-summary", summary="Purchase orders summary for a period")
async def purchases_summary(
    days: int = Query(7, ge=1, le=90),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    schema = require_schema(user)
    models = get_tenant_models(schema)
    Purchase = models["purchases"]

    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            Purchase.supplier,
            func.count(Purchase.id).label("num_orders"),
        )
        .where(Purchase.created_at >= since)
        .group_by(Purchase.supplier)
        .order_by(func.count(Purchase.id).desc())
    )
    rows = result.fetchall()

    total_result = await db.execute(
        select(func.count(Purchase.id)).where(Purchase.created_at >= since)
    )
    total = total_result.scalar() or 0

    return {
        "period_days": days,
        "total_orders": total,
        "by_supplier": [
            {"supplier": r.supplier, "num_orders": r.num_orders}
            for r in rows
        ],
    }


@router.get("/inventory-health", summary="Current inventory health score")
async def inventory_health(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Computes inventory health score based on item stock vs reorder threshold.
    critical = current_qty <= 0
    low = current_qty <= reorder_threshold
    healthy = current_qty > reorder_threshold
    Score = (healthy / total) * 100
    """
    schema = require_schema(user)
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    result = await db.execute(select(InventoryItem))
    items = result.scalars().all()

    if not items:
        return {"score": 100, "label": "No items", "critical": 0, "low": 0, "healthy": 0, "total": 0}

    critical = sum(1 for i in items if i.current_qty <= 0)
    low = sum(1 for i in items if 0 < i.current_qty <= i.reorder_threshold and i.reorder_threshold > 0)
    healthy = len(items) - critical - low
    score = round((healthy / len(items)) * 100)
    label = "Excellent" if score >= 90 else "Good" if score >= 70 else "Fair" if score >= 50 else "Poor"

    return {
        "score": score,
        "label": label,
        "critical": critical,
        "low": low,
        "healthy": healthy,
        "total": len(items),
    }


@router.get("/audit-log", summary="Paginated list of recent activity")
async def audit_log(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import uuid as _uuid
    from app.models.public import User

    schema = require_schema(user)
    models = get_tenant_models(schema)
    Purchase = models["purchases"]
    WastageEntry = models["wastage"]
    InventoryItem = models["inventory"]

    purchase_result = await db.execute(
        select(Purchase).order_by(Purchase.created_at.desc()).limit(limit)
    )
    wastage_result = await db.execute(
        select(WastageEntry).order_by(WastageEntry.created_at.desc()).limit(limit)
    )

    item_cache: dict = {}
    async def resolve_item_name(raw: str) -> str:
        if not raw:
            return "Unknown item"
        if raw in item_cache:
            return item_cache[raw]
        try:
            uid = _uuid.UUID(str(raw))
            inv = await db.get(InventoryItem, uid)
            name = inv.item if inv else raw
        except (ValueError, AttributeError):
            name = raw
        item_cache[raw] = name
        return name

    user_cache: dict = {}
    async def resolve_user_name(raw: str) -> str:
        if not raw:
            return "Staff"
        if raw in user_cache:
            return user_cache[raw]
        try:
            uid = _uuid.UUID(str(raw))
            u = await db.get(User, uid)
            name = (u.name or u.phone) if u else "Staff"
        except (ValueError, AttributeError):
            name = raw if len(raw) < 40 else "Staff"
        user_cache[raw] = name
        return name

    entries = []
    for p in purchase_result.scalars().all():
        recorded_by = await resolve_user_name(str(p.recorded_by) if p.recorded_by else "")
        entries.append({
            "type": "purchase",
            "id": str(p.id),
            "description": f"Purchase from {p.supplier or 'supplier'}",
            "recorded_by": recorded_by,
            "created_at": p.created_at.isoformat() if p.created_at else "",
        })

    for w in wastage_result.scalars().all():
        item_name = await resolve_item_name(str(w.item) if w.item else "")
        recorded_by = await resolve_user_name(str(w.recorded_by) if w.recorded_by else "")
        qty = round(float(w.qty), 2) if w.qty else 0
        entries.append({
            "type": "wastage",
            "id": str(w.id),
            "description": f"Wastage: {item_name} — {qty} {w.unit}",
            "recorded_by": recorded_by,
            "created_at": w.created_at.isoformat() if w.created_at else "",
        })

    entries.sort(key=lambda x: x["created_at"], reverse=True)
    return {"entries": entries[offset:offset + limit], "total": len(entries)}
