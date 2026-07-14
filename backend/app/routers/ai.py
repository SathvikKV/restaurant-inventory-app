import os
import json
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models, require_schema
from app.config import get_settings

router = APIRouter()
settings = get_settings()


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str

class OCRLineItem(BaseModel):
    item_name: str
    quantity: float
    unit: str
    unit_price: Optional[float] = None
    total_price: Optional[float] = None

class OCRResult(BaseModel):
    invoice_number: Optional[str] = None
    supplier_name: Optional[str] = None
    invoice_date: Optional[str] = None
    line_items: List[OCRLineItem]
    total_amount: Optional[float] = None
    confidence_notes: Optional[str] = None


def _get_gemini():
    """Initialize Gemini client. Returns None if API key not set."""
    if not settings.gemini_api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        return genai.GenerativeModel("gemini-2.5-flash")
    except Exception:
        return None


@router.get("/recommendations", summary="Get AI-generated ordering recommendations")
async def get_recommendations(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reads live inventory and generates ordering recommendations.
    Uses Gemini if API key is configured, otherwise returns rule-based recommendations.
    """
    schema = require_schema(user)
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    result = await db.execute(select(InventoryItem))
    items = result.scalars().all()

    # Rule-based: flag items at or below reorder threshold
    recommendations = []
    for item in items:
        if item.reorder_threshold > 0 and item.current_qty <= item.reorder_threshold:
            recommendations.append({
                "id": str(item.id),
                "title": f"Reorder {item.item}",
                "reason": f"Stock at {item.current_qty}{item.unit} — at or below reorder threshold of {item.reorder_threshold}{item.unit}.",
                "item": item.item,
                "item_id": str(item.id),
                "current_qty": item.current_qty,
                "reorder_threshold": item.reorder_threshold,
                "unit": item.unit,
            })
    return recommendations


@router.post("/chat", response_model=ChatResponse, summary="Chat with AI inventory assistant")
async def ai_chat(
    body: ChatRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Sends user message to Gemini with live inventory context.
    Falls back to a canned response if Gemini is not configured.
    """
    schema = require_schema(user)
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]

    result = await db.execute(select(InventoryItem))
    items = result.scalars().all()

    inventory_summary = "\n".join(
        f"- {i.item}: {i.current_qty} {i.unit} (reorder at {i.reorder_threshold})"
        for i in items[:20]
    )

    model = _get_gemini()
    if not model:
        return ChatResponse(reply="AI assistant is not configured. Please set GEMINI_API_KEY.")

    system_context = f"""You are a smart inventory assistant for a restaurant.
Current inventory:
{inventory_summary}

Answer the user's question concisely based on this inventory data."""

    try:
        full_prompt = system_context + f"\n\nUser: {body.message}"
        response = model.generate_content(full_prompt)
        return ChatResponse(reply=response.text)
    except Exception as e:
        return ChatResponse(reply=f"AI error: {str(e)}")


@router.post("/ocr/invoice", response_model=OCRResult, summary="Parse invoice image with OCR")
async def ocr_invoice(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Accepts an invoice image and extracts line items using Gemini Vision.
    Falls back to a placeholder if Gemini is not configured.
    """
    if not settings.gemini_api_key:
        return OCRResult(
            invoice_number="DEMO-001",
            supplier_name="Demo Supplier",
            invoice_date="2026-07-14",
            line_items=[
                OCRLineItem(item_name="Sample Item", quantity=10, unit="kg", unit_price=100, total_price=1000),
            ],
            confidence_notes="Gemini not configured — returning demo data.",
        )

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        image_bytes = await file.read()
        import base64
        image_b64 = base64.b64encode(image_bytes).decode()

        prompt = """Extract invoice data from this image. Return ONLY valid JSON with this structure:
{
  "invoice_number": "string or null",
  "supplier_name": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "line_items": [{"item_name": "string", "quantity": number, "unit": "string", "unit_price": number or null, "total_price": number or null}],
  "total_amount": number or null
}"""

        response = model.generate_content([
            prompt,
            {"mime_type": file.content_type or "image/jpeg", "data": image_b64}
        ])

        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())

        return OCRResult(
            invoice_number=data.get("invoice_number"),
            supplier_name=data.get("supplier_name"),
            invoice_date=data.get("invoice_date"),
            line_items=[OCRLineItem(**item) for item in data.get("line_items", [])],
            total_amount=data.get("total_amount"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


@router.get("/insights", summary="Get AI-generated insights")
async def get_insights(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns rule-based insights from live inventory and wastage data."""
    schema = require_schema(user)
    models = get_tenant_models(schema)
    InventoryItem = models["inventory"]
    WastageEntry = models["wastage"]

    inv_result = await db.execute(select(InventoryItem))
    items = inv_result.scalars().all()

    waste_result = await db.execute(select(WastageEntry))
    wastage = waste_result.scalars().all()

    insights = []

    critical_items = [i for i in items if i.current_qty <= 0]
    if critical_items:
        names = ", ".join(i.item for i in critical_items[:3])
        insights.append({
            "type": "critical_stock",
            "message": f"{len(critical_items)} item(s) are out of stock: {names}."
        })

    low_items = [i for i in items if 0 < i.current_qty <= i.reorder_threshold and i.reorder_threshold > 0]
    if low_items:
        insights.append({
            "type": "low_stock",
            "message": f"{len(low_items)} item(s) are below reorder threshold."
        })

    if wastage:
        insights.append({
            "type": "wastage_info",
            "message": f"{len(wastage)} wastage entries recorded. Review to reduce losses."
        })

    if not insights:
        insights.append({
            "type": "all_good",
            "message": "Inventory looks healthy. No immediate action needed."
        })

    return {"insights": insights}
