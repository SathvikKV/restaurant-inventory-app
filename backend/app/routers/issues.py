"""
Issues (indents) router.
"""
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.middleware.auth_middleware import get_current_user, get_current_actor
from app.services.tenant_registry import get_tenant_models
from app.services.s3_service import get_s3_presigned_url
from app.services.transaction_log import log_transaction
from app.services.units import normalize_to_base, to_display_pair
from app.routers.purchase_orders import _best_match_semantic

router = APIRouter()


class IssueResponse(BaseModel):
    id: str
    indent_number: Optional[str] = None
    outlet: Optional[str] = None
    section: Optional[str] = None
    destination: str
    items_summary: str
    items: Any
    recorded_by: Optional[str] = None
    status: Optional[str] = "active"
    date_label: str
    created_at: str
    image_url: Optional[str] = None


def _map_issue_response(issue) -> dict:
    dest = issue.section or issue.outlet or "Kitchen / General"
    if issue.section and issue.outlet and issue.section != issue.outlet:
        dest = f"{issue.section} ({issue.outlet})"

    items_summary = "Various items"
    if isinstance(issue.items, dict) and issue.items:
        parts = [f"{k}: {v}" for k, v in issue.items.items()]
        items_summary = ", ".join(parts[:3]) + ("..." if len(parts) > 3 else "")
    elif isinstance(issue.items, list) and len(issue.items) > 0:
        items_summary = f"{len(issue.items)} item(s) issued"
    elif not issue.items:
        items_summary = "No items detailed"

    return {
        "id": str(issue.id),
        "indent_number": getattr(issue, "indent_number", None),
        "outlet": getattr(issue, "outlet", None),
        "section": getattr(issue, "section", None),
        "destination": str(dest),
        "items_summary": str(items_summary),
        "items": issue.items or {},
        "recorded_by": getattr(issue, "recorded_by", "") or "",
        "status": getattr(issue, "status", "active") or "active",
        "date_label": issue.created_at.strftime("%d %b %Y") if getattr(issue, "created_at", None) else "Unknown",
        "created_at": issue.created_at.isoformat() if getattr(issue, "created_at", None) else "",
        "image_url": get_s3_presigned_url(getattr(issue, "s3_key", None)),
    }


@router.get("/", response_model=List[IssueResponse], summary="List issues (indents)")
async def list_issues(
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
    Issue = models["issues"]

    stmt = select(Issue).order_by(Issue.created_at.desc()).limit(limit).offset(offset)
    if status_filter:
        stmt = stmt.where(Issue.status == status_filter)

    result = await db.execute(stmt)
    issues = result.scalars().all()
    return [_map_issue_response(iss) for iss in issues]


@router.get("/{issue_id}", response_model=IssueResponse, summary="Get a single issue (indent)")
async def get_issue(
    issue_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Issue = models["issues"]

    iss = await db.get(Issue, uuid.UUID(issue_id))
    if not iss:
        raise HTTPException(status_code=404, detail="Issue not found")
    return _map_issue_response(iss)


class IndentLineItemIn(BaseModel):
    item_name: str
    quantity: float
    unit: str


class IndentSaveRequest(BaseModel):
    section: Optional[str] = None
    indent_number: Optional[str] = None
    indent_s3_key: Optional[str] = None
    line_items: List[IndentLineItemIn]
    resolutions: Optional[dict] = None
    tenant_schema: Optional[str] = None
    recorded_by_name: Optional[str] = None


@router.post("/from-ocr", summary="Save an OCR-extracted kitchen indent and deduct inventory")
async def create_issue_from_ocr(
    body: IndentSaveRequest,
    actor: dict = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db)
):
    if actor.get("actor_type") == "mise_service":
        if not body.tenant_schema or not body.recorded_by_name:
            raise HTTPException(status_code=400, detail="tenant_schema and recorded_by_name are required for service-authenticated requests")
        schema = body.tenant_schema
        recorded_by_name = body.recorded_by_name
        from app.models.public import Tenant
        tenant_res = await db.execute(select(Tenant).where(Tenant.schema_name == schema))
        tenant_record = tenant_res.scalar_one_or_none()
        spreadsheet_id = tenant_record.spreadsheet_id if tenant_record else None
    else:
        schema = actor.get("schema")
        if not schema:
            raise HTTPException(status_code=400, detail="User has no assigned restaurant")
        from app.models.public import User, Tenant
        user_record = await db.get(User, uuid.UUID(actor["user_id"]))
        tenant_record = await db.get(Tenant, user_record.tenant_id) if user_record and user_record.tenant_id else None
        spreadsheet_id = tenant_record.spreadsheet_id if tenant_record else None
        recorded_by_name = getattr(user_record, "name", None) if user_record else actor["user_id"]
        if not recorded_by_name:
            recorded_by_name = actor["user_id"]

    models = get_tenant_models(schema)
    InventoryItem, Issue, PendingConfirmation = models["inventory"], models["issues"], models["confirmations"]

    inv_res = await db.execute(select(InventoryItem))
    existing_items = list(inv_res.scalars().all())

    for line in body.line_items:
        line.quantity, line.unit = normalize_to_base(line.quantity, line.unit)

    issue_record = Issue(
        section=body.section or "Kitchen",
        outlet="Kitchen",
        indent_number=body.indent_number,
        items={line.item_name: line.quantity for line in body.line_items},
        recorded_by=recorded_by_name,
        s3_key=body.indent_s3_key,
        status="active",
    )
    db.add(issue_record)
    await db.flush()
    source_ref = body.indent_s3_key or str(issue_record.id)

    resolutions = body.resolutions or {}
    accepted, denied = [], []
    saved_items, review_items = [], []
    sync_calls = []

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
                    if target_item.current_qty < line.quantity:
                        denied.append({"item": line.item_name, "reason": "Insufficient stock", "available": target_item.current_qty})
                        disp_qty, disp_unit = to_display_pair(line.quantity, line.unit)
                        review_items.append({"item_name": line.item_name, "quantity": disp_qty, "unit": disp_unit, "reason": "Insufficient stock", "candidate": target_item.item, "score": 1.0})
                        continue
                    target_item.previous_qty = target_item.current_qty
                    target_item.current_qty -= line.quantity
                    target_item.previous_updated = target_item.last_updated
                    target_item.last_updated = datetime.now(timezone.utc)
                    await log_transaction(db, models, item_id=target_item.id, item_name=target_item.item, action="issue",
                                           quantity_delta=-line.quantity, resulting_qty=target_item.current_qty, unit=target_item.unit,
                                           recorded_by=recorded_by_name, source_reference=source_ref)
                    accepted.append(line.item_name)
                    sync_calls.append({"item_name": target_item.item, "quantity": line.quantity, "unit": target_item.unit})
                else:
                    denied.append({"item": line.item_name, "reason": "Target item not found"})
                    disp_qty, disp_unit = to_display_pair(line.quantity, line.unit)
                    review_items.append({"item_name": line.item_name, "quantity": disp_qty, "unit": disp_unit, "reason": "Target item not found"})
            elif res.get("same") is False:
                denied.append({"item": line.item_name, "reason": "Marked as different item (cannot issue uncreated stock)"})
                disp_qty, disp_unit = to_display_pair(line.quantity, line.unit)
                review_items.append({"item_name": line.item_name, "quantity": disp_qty, "unit": disp_unit, "reason": "Cannot issue uncreated stock"})
            continue

        best_item, score = await _best_match_semantic(line.item_name, existing_items)
        _, best_norm_unit = normalize_to_base(0.0, best_item.unit) if best_item else (0.0, "")
        if score >= 0.95 and best_item and best_norm_unit.strip().lower() == line.unit.strip().lower():
            if best_item.current_qty < line.quantity:
                denied.append({"item": line.item_name, "reason": "Insufficient stock", "available": best_item.current_qty})
                disp_qty, disp_unit = to_display_pair(line.quantity, line.unit)
                review_items.append({"item_name": line.item_name, "quantity": disp_qty, "unit": disp_unit, "reason": "Insufficient stock", "candidate": best_item.item, "score": float(score)})
                continue
            best_item.previous_qty = best_item.current_qty
            best_item.current_qty -= line.quantity
            best_item.previous_updated = best_item.last_updated
            best_item.last_updated = datetime.now(timezone.utc)
            await log_transaction(db, models, item_id=best_item.id, item_name=best_item.item, action="issue",
                                   quantity_delta=-line.quantity, resulting_qty=best_item.current_qty, unit=best_item.unit,
                                   recorded_by=recorded_by_name, source_reference=source_ref)
            accepted.append(line.item_name)
            sync_calls.append({"item_name": best_item.item, "quantity": line.quantity, "unit": best_item.unit})
        else:
            existing_pending = await db.execute(
                select(PendingConfirmation).where(
                    PendingConfirmation.extracted_name == line.item_name,
                    PendingConfirmation.status == "pending",
                )
            )
            if not existing_pending.scalar_one_or_none():
                db.add(PendingConfirmation(
                    extracted_name=line.item_name,
                    candidate_name=best_item.item if best_item else "None",
                    score=score if best_item else 0.0,
                    quantity=line.quantity,
                    unit=line.unit,
                    source="app_indent",
                    source_reference=source_ref,
                ))
            reason_str = "Needs review" if (best_item and score >= 0.80) else "Item not found"
            denied.append({"item": line.item_name, "reason": reason_str})
            disp_qty, disp_unit = to_display_pair(line.quantity, line.unit)
            review_items.append({"item_name": line.item_name, "quantity": disp_qty, "unit": disp_unit, "reason": reason_str, "candidate": best_item.item if (best_item and score >= 0.80) else None, "score": float(score) if (best_item and score >= 0.80) else 0.0})

    await db.commit()

    from app.services.mise_writeback import push_to_mise
    for call in sync_calls:
        disp_qty, disp_unit = to_display_pair(call["quantity"], call["unit"])
        saved_items.append({"item_name": call["item_name"], "quantity": disp_qty, "unit": disp_unit})
        asyncio.create_task(push_to_mise(
            action="issue", item_name=call["item_name"], quantity=disp_qty,
            unit=disp_unit, recorded_by=recorded_by_name, destination=body.section or "Kitchen",
            spreadsheet_id=spreadsheet_id
        ))

    return {"accepted": accepted, "denied": denied, "saved_items": saved_items, "review_items": review_items}

