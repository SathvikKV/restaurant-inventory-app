import os
import json
import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional, Literal
import base64
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models, require_schema
from app.config import get_settings
from app.services.s3_service import upload_document_to_s3

logger = logging.getLogger("app.routers.ai")
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
    pack_size: Optional[float] = None
    pack_unit: Optional[str] = None
    unit_price: Optional[int] = None
    total_price: Optional[int] = None
    flagged_for_review: Optional[bool] = False
    flag_reason: Optional[str] = None

class OCRResult(BaseModel):
    invoice_number: Optional[str] = None
    supplier_name: Optional[str] = None
    invoice_date: Optional[str] = None
    line_items: List[OCRLineItem]
    total_amount: Optional[int] = None
    confidence_notes: Optional[str] = None
    s3_key: Optional[str] = None

class RecipeIngredientOut(BaseModel):
    name: str
    unit: str
    quantity_per_serving: float
    category: str  # one of the 9 valid categories

class RecipeOut(BaseModel):
    dish_name: str
    ingredients: List[RecipeIngredientOut]

class MenuOCRResult(BaseModel):
    recipes: List[RecipeOut]


class ClassifyResult(BaseModel):
    document_type: Literal["supplier_invoice", "kitchen_indent", "unknown"]


class IndentLineItem(BaseModel):
    item_name: str
    quantity: float
    unit: str


class IndentOCRResult(BaseModel):
    section: Optional[str] = None
    line_items: List[IndentLineItem]
    s3_key: Optional[str] = None


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
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(model.generate_content, full_prompt),
                timeout=150.0
            )
        except asyncio.TimeoutError:
            logger.error("Gemini call timed out after 150s")
            raise HTTPException(status_code=504, detail="AI processing timed out. Please try again.")
        return ChatResponse(reply=response.text)
    except HTTPException:
        raise
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
                OCRLineItem(item_name="Sample Item", quantity=10, unit="kg", unit_price=10000, total_price=100000),
            ],
            confidence_notes="Gemini not configured — returning demo data.",
        )

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        image_bytes = await file.read()
        s3_key = None
        try:
            schema = user.get("schema", "default")
            s3_key = await asyncio.to_thread(upload_document_to_s3, image_bytes, file.content_type or "image/jpeg", schema, "invoices")
        except Exception as e:
            logger.warning(f"Failed to upload invoice document to S3: {e}")

        import base64
        image_b64 = base64.b64encode(image_bytes).decode()

        prompt = """Extract invoice data from this image. Return ONLY valid JSON with this structure:
{
  "invoice_number": "string or null",
  "supplier_name": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "line_items": [{"item_name": "string", "quantity": number, "unit": "string", "pack_size": number or null, "pack_unit": "string or null", "unit_price": number or null, "total_price": number or null}],
  "total_amount": number or null
}

Instructions for line_items:
- `quantity` and `unit`: Extract the primary quantity and unit (e.g., for "3 bags", quantity=3, unit="bags").
- `pack_size` and `pack_unit`: If the invoice specifies how much is in EACH pack/unit (e.g., "3 bags (25kg each)"), extract the size per pack (pack_size=25) and its unit (pack_unit="kg"). If no pack size is specified, set both to null."""

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    [
                        prompt,
                        {"mime_type": file.content_type or "image/jpeg", "data": image_b64}
                    ]
                ),
                timeout=150.0
            )
        except asyncio.TimeoutError:
            logger.error("Gemini call timed out after 150s")
            raise HTTPException(status_code=504, detail="AI processing timed out. Please try again.")

        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())

        parsed_items = []
        for item in data.get("line_items", []):
            up = item.get("unit_price")
            tp = item.get("total_price")
            
            from app.services.pricing import to_paise
            up_paise = to_paise(up)
            tp_paise = to_paise(tp)
            
            li = OCRLineItem(
                item_name=item.get("item_name"),
                quantity=float(item.get("quantity", 0)),
                unit=item.get("unit", "pcs"),
                pack_size=item.get("pack_size"),
                pack_unit=item.get("pack_unit"),
                unit_price=up_paise,
                total_price=tp_paise
            )
            if li.quantity and li.unit_price and li.total_price:
                computed = li.quantity * li.unit_price
                if abs(computed - li.total_price) > 0.02 * li.total_price:
                    li.flagged_for_review = True
                    li.flag_reason = "Price mismatch: quantity × unit price does not match total price"
            parsed_items.append(li)

        ta = data.get("total_amount")
        from app.services.pricing import to_paise
        ta_paise = to_paise(ta)

        return OCRResult(
            invoice_number=data.get("invoice_number"),
            supplier_name=data.get("supplier_name"),
            invoice_date=data.get("invoice_date"),
            line_items=parsed_items,
            total_amount=ta_paise,
            s3_key=s3_key,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


@router.post("/classify-document", response_model=ClassifyResult, summary="Classify document as invoice or indent")
async def classify_document(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    if not settings.gemini_api_key:
        return ClassifyResult(document_type="supplier_invoice")
    try:
        model = _get_gemini()
        image_bytes = await file.read()
        image_b64 = base64.b64encode(image_bytes).decode()
        prompt = """Look at this image. Is it a SUPPLIER INVOICE (a bill from a vendor listing purchased goods with prices) or a KITCHEN INDENT (an internal slip listing items requested/issued to a kitchen section, usually no prices)? Respond with strict JSON only: {"document_type": "supplier_invoice" | "kitchen_indent" | "unknown"}"""
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(model.generate_content, [{"mime_type": file.content_type or "image/jpeg", "data": image_b64}, prompt]),
                timeout=60.0
            )
        except asyncio.TimeoutError:
            logger.error("Gemini call timed out after 60s")
            raise HTTPException(status_code=504, detail="AI processing timed out. Please try again.")
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        doc_type = data.get("document_type", "unknown")
        if doc_type not in ("supplier_invoice", "kitchen_indent", "unknown"):
            doc_type = "unknown"
        return ClassifyResult(document_type=doc_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return ClassifyResult(document_type="unknown")


@router.post("/ocr/indent", response_model=IndentOCRResult, summary="Parse kitchen indent image with OCR")
async def ocr_indent(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    if not settings.gemini_api_key:
        return IndentOCRResult(
            section="Demo Kitchen Section",
            line_items=[
                IndentLineItem(item_name="Sample Ingredient", quantity=2.0, unit="kg"),
            ],
        )
    try:
        model = _get_gemini()
        image_bytes = await file.read()
        s3_key = None
        try:
            schema = user.get("schema", "default")
            s3_key = await asyncio.to_thread(upload_document_to_s3, image_bytes, file.content_type or "image/jpeg", schema, "indents")
        except Exception as e:
            logger.warning(f"Failed to upload indent document to S3: {e}")

        image_b64 = base64.b64encode(image_bytes).decode()
        prompt = """Extract kitchen indent (internal stock transfer / requisition slip) data from this image. Notice there are usually no prices, just items requested or issued to a kitchen section or station. Return ONLY valid JSON with this structure:
{
  "section": "string or null (e.g. Hot Kitchen, Bakery, Bar, Kitchen)",
  "line_items": [{"item_name": "string", "quantity": number, "unit": "string"}]
}"""
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(model.generate_content, [prompt, {"mime_type": file.content_type or "image/jpeg", "data": image_b64}]),
                timeout=150.0
            )
        except asyncio.TimeoutError:
            logger.error("Gemini call timed out after 150s")
            raise HTTPException(status_code=504, detail="AI processing timed out. Please try again.")
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        return IndentOCRResult(
            section=data.get("section"),
            line_items=[IndentLineItem(**item) for item in data.get("line_items", [])],
            s3_key=s3_key,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR indent failed: {str(e)}")

@router.post("/ocr/menu", response_model=MenuOCRResult, summary="Extract dishes and infer core ingredients from a menu photo")
async def ocr_menu(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    if not settings.gemini_api_key:
        return MenuOCRResult(
            recipes=[
                RecipeOut(
                    dish_name="Demo Butter Chicken",
                    ingredients=[
                        RecipeIngredientOut(name="Chicken", unit="g", quantity_per_serving=250.0, category="proteins"),
                        RecipeIngredientOut(name="Cream", unit="ml", quantity_per_serving=50.0, category="dairy"),
                        RecipeIngredientOut(name="Tomato Puree", unit="g", quantity_per_serving=100.0, category="produce"),
                    ]
                ),
                RecipeOut(
                    dish_name="Demo Garlic Naan",
                    ingredients=[
                        RecipeIngredientOut(name="Maida", unit="g", quantity_per_serving=120.0, category="dry goods"),
                        RecipeIngredientOut(name="Garlic", unit="g", quantity_per_serving=15.0, category="produce"),
                        RecipeIngredientOut(name="Butter", unit="g", quantity_per_serving=20.0, category="dairy"),
                    ]
                ),
            ]
        )

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        image_bytes = await file.read()
        import base64
        image_b64 = base64.b64encode(image_bytes).decode()

        prompt = """You are analyzing a restaurant menu photo. 
1. Identify each distinct dish name listed.
2. For each dish, infer a realistic list of core ingredients and a reasonable per-serving quantity for each (e.g. "200" grams of rice for one plate of biryani) — these are estimates the owner will review and correct, not exact recipe science. Assign each ingredient a category, which MUST be exactly one of: produce, proteins, dairy, dry goods, beverages, bakery, packaging, cleaning, misc.

Return strict JSON only:
{"recipes": [{"dish_name": "...", "ingredients": [{"name": "...", "unit": "...", "quantity_per_serving": number, "category": "..."}]}]}"""

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    [
                        prompt,
                        {"mime_type": file.content_type or "image/jpeg", "data": image_b64}
                    ]
                ),
                timeout=150.0
            )
        except asyncio.TimeoutError:
            logger.error("Gemini call timed out after 150s")
            raise HTTPException(status_code=504, detail="AI processing timed out. Please try again.")

        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())

        return MenuOCRResult(
            recipes=[RecipeOut(**item) for item in data.get("recipes", [])]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Menu OCR failed: {str(e)}")

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
