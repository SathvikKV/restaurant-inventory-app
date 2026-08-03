"""
Issues (indents) router.
"""
import uuid
from typing import List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models
from app.services.s3_service import get_s3_presigned_url

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
