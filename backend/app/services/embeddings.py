import math
import google.generativeai as genai
from app.config import get_settings

settings = get_settings()

def get_embedding(text: str) -> list[float]:
    genai.configure(api_key=settings.gemini_api_key)
    result = genai.embed_content(model="models/gemini-embedding-001", content=text, task_type="SEMANTIC_SIMILARITY")
    return result["embedding"]

def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0
