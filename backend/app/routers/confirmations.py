"""
Confirmations router — Zone 2 fuzzy match resolution.
"""
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models, require_schema
from app.services.embeddings import get_embedding
from app.services.transaction_log import log_transaction
from app.services.units import normalize_to_base, to_display_pair

router = APIRouter()

@router.get("", summary="List pending confirmations")
async def list_confirmations(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    schema = require_schema(user)
    models = get_tenant_models(schema)
    PendingConfirmation = models["confirmations"]
    result = await db.execute(select(PendingConfirmation).where(PendingConfirmation.status == "pending").order_by(PendingConfirmation.created_at.desc()))
    rows = result.scalars().all()
    return [{"id": str(r.id), "extracted_name": r.extracted_name, "candidate_name": r.candidate_name,
             "score": r.score, "quantity": r.quantity, "unit": r.unit, "created_at": r.created_at.isoformat()} for r in rows]

class ResolveConfirmation(BaseModel):
    action: Literal["same", "different"]

@router.post("/{confirmation_id}/resolve")
async def resolve_confirmation(confirmation_id: uuid.UUID, body: ResolveConfirmation, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    schema = require_schema(user)
    models = get_tenant_models(schema)
    PendingConfirmation, InventoryItem = models["confirmations"], models["inventory"]
    confirmation = await db.get(PendingConfirmation, confirmation_id)
    if not confirmation:
        raise HTTPException(status_code=404, detail="Confirmation not found")

    from app.models.public import User, Tenant
    user_record = await db.get(User, uuid.UUID(user["user_id"]))
    tenant_record = await db.get(Tenant, user_record.tenant_id) if user_record and user_record.tenant_id else None
    spreadsheet_id = tenant_record.spreadsheet_id if tenant_record else None

    recorded_by_name = getattr(user_record, "name", None) if user_record else user["user_id"]
    if not recorded_by_name:
        recorded_by_name = user["user_id"]

    norm_qty, norm_unit = normalize_to_base(confirmation.quantity, confirmation.unit)
    item = None
    if body.action == "same":
        result = await db.execute(select(InventoryItem).where(func.lower(InventoryItem.item) == confirmation.candidate_name.strip().lower()))
        item = result.scalar_one_or_none()
        if item:
            item.unit = norm_unit
            item.previous_qty = item.current_qty
            item.current_qty += norm_qty
            item.last_updated = datetime.now(timezone.utc)
            await log_transaction(
                db, models, item_id=item.id, item_name=item.item, action="confirmation_resolved",
                quantity_delta=norm_qty, resulting_qty=item.current_qty, unit=norm_unit,
                recorded_by=recorded_by_name, source_reference=f"Confirmation #{confirmation.id}"
            )
    else:
        new_inv = InventoryItem(item=confirmation.extracted_name, unit=norm_unit, current_qty=norm_qty,
                              previous_qty=0.0, reorder_threshold=0.0, category="misc", last_updated=datetime.now(timezone.utc),
                              embedding=await asyncio.to_thread(get_embedding, confirmation.extracted_name))
        db.add(new_inv)
        await db.flush()
        await log_transaction(
            db, models, item_id=new_inv.id, item_name=new_inv.item, action="confirmation_resolved",
            quantity_delta=norm_qty, resulting_qty=new_inv.current_qty, unit=new_inv.unit,
            recorded_by=recorded_by_name, source_reference=f"Confirmation #{confirmation.id}"
        )

    confirmation.status = "resolved"
    await db.commit()

    from app.services.mise_writeback import push_to_mise

    disp_qty, disp_unit = to_display_pair(norm_qty, norm_unit)
    if body.action == "same" and item:
        asyncio.create_task(push_to_mise(
            action="receive", item_name=item.item, quantity=disp_qty,
            unit=disp_unit, recorded_by=recorded_by_name, spreadsheet_id=spreadsheet_id
        ))
    elif body.action == "different":
        asyncio.create_task(push_to_mise(
            action="receive", item_name=confirmation.extracted_name, quantity=disp_qty,
            unit=disp_unit, recorded_by=recorded_by_name, spreadsheet_id=spreadsheet_id
        ))

    return {"status": "ok"}
