"""
AI service — Gemini integration for recommendations, chat, and OCR.
Reuses the pattern from mise/app/services/vision.py.
"""
from typing import List, Optional
from app.config import get_settings

settings = get_settings()


async def get_recommendations(restaurant_id: str) -> List[dict]:
    """
    Generate purchase recommendations for all critical/low items.

    TODO:
    1. Fetch all critical + low inventory items from DB.
    2. Fetch supplier price history for each item.
    3. Build a structured prompt:
         "Given these stock levels and supplier prices, recommend what to order..."
    4. Call Gemini API (settings.gemini_api_key).
    5. Parse the JSON response into a list of AIRecommendation dicts.
    """
    raise NotImplementedError("Wire up Gemini for recommendations")


async def chat(message: str, history: List[dict], restaurant_id: str) -> str:
    """
    Send a message to the AI assistant with restaurant context.

    TODO:
    1. Build a system prompt with live stock levels, recent POs, and wastage data.
    2. Format history as alternating user/model turns.
    3. Call Gemini generate_content / chat session.
    4. Return the model's text reply.
    """
    raise NotImplementedError("Wire up Gemini chat")


async def ocr_invoice(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Extract structured invoice data from an image using Gemini Vision.

    TODO:
    1. Upload image_bytes to S3 and get a presigned URL (or pass inline).
    2. Build the extraction prompt (see mise/app/services/vision.py for reference).
    3. Call Gemini Vision with the image + prompt.
    4. Parse the JSON block from the response.
    5. Return an OCRResult-compatible dict.
    """
    raise NotImplementedError("Wire up Gemini Vision for OCR")


async def generate_insights(restaurant_id: str, period: str = "week") -> List[dict]:
    """
    Generate natural-language insights from aggregated data.

    TODO:
    1. Aggregate food cost, wastage, and usage data for the period.
    2. Build an analysis prompt.
    3. Call Gemini and parse the response into insight cards.
    """
    raise NotImplementedError("Wire up Gemini for insights")
