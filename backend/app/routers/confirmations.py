"""
Confirmations router — Zone 2 fuzzy match resolution.
"""
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.constants import PURCHASE_SOURCE
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
             "score": r.score, "quantity": r.quantity, "unit": r.unit, "ai_match_reason": r.ai_match_reason, "created_at": r.created_at.isoformat()} for r in rows]

class ResolveConfirmation(BaseModel):
    action: Literal["same", "different", "pack_size"]
    pack_size: Optional[float] = None
    pack_unit: Optional[str] = None

# Removed _INDENT_SOURCES, now importing INDENT_SOURCE directly when needed.

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
    tenant_id_str = user.get("tenant_id")
    tenant_record = None
    if user_record and tenant_id_str:
        from app.models.public import UserTenantMembership
        from sqlalchemy import select
        mem_res = await db.execute(
            select(Tenant).join(UserTenantMembership, UserTenantMembership.tenant_id == Tenant.id)
            .where(UserTenantMembership.user_id == user_record.id, UserTenantMembership.tenant_id == uuid.UUID(tenant_id_str))
        )
        tenant_record = mem_res.scalar_one_or_none()
    spreadsheet_id = tenant_record.spreadsheet_id if tenant_record else None

    recorded_by_name = getattr(user_record, "name", None) if user_record else user["user_id"]
    if not recorded_by_name:
        recorded_by_name = user["user_id"]

    norm_qty, norm_unit = normalize_to_base(confirmation.quantity, confirmation.unit)
    
    from app.constants import INDENT_SOURCE
    is_indent_source = (confirmation.source == INDENT_SOURCE)
    
    item = None
    if body.action == "same":
        result = await db.execute(select(InventoryItem).where(func.lower(InventoryItem.item) == confirmation.candidate_name.strip().lower()))
        item = result.scalar_one_or_none()
        if item:
            old_qty = item.current_qty
            item.unit = norm_unit
            item.previous_qty = item.current_qty
            item.current_qty += norm_qty
            item.last_updated = datetime.now(timezone.utc)
            
            if not is_indent_source and confirmation.unit_price is not None:
                from app.services.pricing import update_moving_average_price
                item.avg_price_per_base_unit = update_moving_average_price(
                    old_avg_price=item.avg_price_per_base_unit,
                    old_qty=old_qty,
                    incoming_unit_price=confirmation.unit_price,
                    incoming_purchase_unit=confirmation.purchase_unit or confirmation.unit,
                    incoming_qty=norm_qty
                )
                
            await log_transaction(
                db, models, item_id=item.id, item_name=item.item, action="confirmation_resolved",
                quantity_delta=norm_qty, resulting_qty=item.current_qty, unit=norm_unit,
                recorded_by=recorded_by_name, source_reference=confirmation.source_reference or f"Confirmation #{confirmation.id}"
            )
    elif body.action == "different":
        if is_indent_source:
            # Indent = consumption, not receipt. Create the new item at zero stock so no phantom
            # inventory is created, then immediately deduct the consumed quantity so the item
            # lands at -norm_qty. Negative stock here is intentional: it surfaces an honest gap
            # ("this was consumed before it was ever recorded as received") rather than hiding it.
            new_inv = InventoryItem(
                item=confirmation.extracted_name, unit=norm_unit,
                current_qty=-norm_qty, previous_qty=0.0,
                reorder_threshold=0.0, category="misc",
                last_updated=datetime.now(timezone.utc),
                embedding=await asyncio.to_thread(get_embedding, confirmation.extracted_name)
            )
            db.add(new_inv)
            await db.flush()
            await log_transaction(
                db, models, item_id=new_inv.id, item_name=new_inv.item,
                action="unrecorded_consumption",
                quantity_delta=-norm_qty, resulting_qty=-norm_qty, unit=norm_unit,
                recorded_by=recorded_by_name,
                source_reference=confirmation.source_reference or f"Confirmation #{confirmation.id}"
            )
            item = new_inv
        else:
            # Purchase/invoice source: quantity is a receipt — seed at the received amount.
            avg_price = None
            if confirmation.unit_price is not None:
                from app.services.pricing import update_moving_average_price
                avg_price = update_moving_average_price(
                    old_avg_price=None,
                    old_qty=0.0,
                    incoming_unit_price=confirmation.unit_price,
                    incoming_purchase_unit=confirmation.purchase_unit or confirmation.unit,
                    incoming_qty=norm_qty
                )
            new_inv = InventoryItem(
                item=confirmation.extracted_name, unit=norm_unit, current_qty=norm_qty,
                previous_qty=0.0, reorder_threshold=0.0, category="misc",
                avg_price_per_base_unit=avg_price,
                last_updated=datetime.now(timezone.utc),
                embedding=await asyncio.to_thread(get_embedding, confirmation.extracted_name)
            )
            db.add(new_inv)
            await db.flush()
            await log_transaction(
                db, models, item_id=new_inv.id, item_name=new_inv.item, action="invoice",
                quantity_delta=norm_qty, resulting_qty=new_inv.current_qty, unit=norm_unit,
                recorded_by=recorded_by_name, source_reference=confirmation.source_reference or f"Confirmation #{confirmation.id}"
            )
            item = new_inv

    elif body.action == "pack_size":
        if not body.pack_size or not body.pack_unit:
            raise HTTPException(status_code=400, detail="pack_size and pack_unit are required for pack_size action")
        
        # Calculate new total base quantity
        total_quantity = confirmation.quantity * body.pack_size
        try:
            norm_qty, norm_unit = normalize_to_base(total_quantity, body.pack_unit)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid pack unit: {str(e)}")

        # Run match pipeline now that we have a valid base quantity and unit
        from app.services.matching import match_pipeline
        inv_res = await db.execute(select(InventoryItem))
        existing_items = list(inv_res.scalars().all())
        
        match_result = await match_pipeline(confirmation.extracted_name, norm_qty, norm_unit, existing_items)
        best_item = match_result["candidate"]
        
        if match_result["status"] == "exact" and best_item:
            old_qty = best_item.current_qty
            best_item.unit = norm_unit
            best_item.previous_qty = best_item.current_qty
            best_item.current_qty += norm_qty
            best_item.last_updated = datetime.now(timezone.utc)
            
            if confirmation.unit_price is not None:
                from app.services.pricing import update_moving_average_price
                best_item.avg_price_per_base_unit = update_moving_average_price(
                    old_avg_price=best_item.avg_price_per_base_unit,
                    old_qty=old_qty,
                    incoming_unit_price=confirmation.unit_price,
                    incoming_purchase_unit=confirmation.purchase_unit or confirmation.unit,
                    incoming_qty=norm_qty
                )
            await log_transaction(
                db, models, item_id=best_item.id, item_name=best_item.item, action="invoice",
                quantity_delta=norm_qty, resulting_qty=best_item.current_qty, unit=norm_unit,
                recorded_by=recorded_by_name, source_reference=confirmation.source_reference or f"Confirmation #{confirmation.id}"
            )
            item = best_item
        elif match_result["status"] == "needs_review" and best_item:
            # We resolved the pack size, but now we need an identity review. 
            # We convert this confirmation into an identity confirmation.
            confirmation.status = "pending"
            confirmation.source = PURCHASE_SOURCE
            confirmation.candidate_name = best_item.item
            confirmation.score = match_result["score"]
            confirmation.quantity = norm_qty
            confirmation.unit = norm_unit
            confirmation.ai_match_reason = match_result["reason"]
            await db.commit()
            return {"status": "ok", "message": "Pack size resolved, but item identity needs review", "next_step": "review"}
        else:
            # No match, create new item
            avg_price = None
            if confirmation.unit_price is not None:
                from app.services.pricing import update_moving_average_price
                avg_price = update_moving_average_price(
                    old_avg_price=None,
                    old_qty=0.0,
                    incoming_unit_price=confirmation.unit_price,
                    incoming_purchase_unit=confirmation.purchase_unit or confirmation.unit,
                    incoming_qty=norm_qty
                )
            new_inv = InventoryItem(
                item=confirmation.extracted_name, unit=norm_unit, current_qty=norm_qty,
                previous_qty=0.0, reorder_threshold=0.0, category="misc",
                avg_price_per_base_unit=avg_price,
                last_updated=datetime.now(timezone.utc),
                embedding=await asyncio.to_thread(get_embedding, confirmation.extracted_name)
            )
            db.add(new_inv)
            await db.flush()
            await log_transaction(
                db, models, item_id=new_inv.id, item_name=new_inv.item, action="invoice",
                quantity_delta=norm_qty, resulting_qty=new_inv.current_qty, unit=norm_unit,
                recorded_by=recorded_by_name, source_reference=confirmation.source_reference or f"Confirmation #{confirmation.id}"
            )
            item = new_inv

    if body.action != "pack_size" or (body.action == "pack_size" and item):
        confirmation.status = "resolved"
    await db.commit()

    from app.services.mise_writeback import push_to_mise

    disp_qty, disp_unit = to_display_pair(norm_qty, norm_unit)
    if body.action == "same" and item:
        asyncio.create_task(push_to_mise(
            action="receive", item_name=item.item, quantity=disp_qty,
            unit=disp_unit, recorded_by=recorded_by_name, spreadsheet_id=spreadsheet_id
        ))
    elif body.action == "different" and not is_indent_source:
        # Only write back to Mise for purchase-sourced new items (genuine receipts).
        # Indent-sourced shortfalls must not produce a fake receive entry in the spreadsheet.
        asyncio.create_task(push_to_mise(
            action="receive", item_name=confirmation.extracted_name, quantity=disp_qty,
            unit=disp_unit, recorded_by=recorded_by_name, spreadsheet_id=spreadsheet_id
        ))

    return {"status": "ok"}
