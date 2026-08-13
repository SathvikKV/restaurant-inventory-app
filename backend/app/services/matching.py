import os
import re
import asyncio
import json
import logging
import google.generativeai as genai
from typing import List, Optional, Tuple, Any
from app.services.embeddings import get_embedding, cosine_similarity

logger = logging.getLogger(__name__)

class GateEvaluationError(Exception):
    pass

# Use settings.gemini_api_key to ensure this works in production (EB env var)
# rather than falling back to os.getenv which is not set locally.
def _get_model():
    try:
        from app.config import get_settings
        api_key = get_settings().gemini_api_key or os.getenv("GEMINI_API_KEY")
    except Exception:
        api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
    # gemini-1.5-flash was deprecated (404). gemini-2.0-flash also 404s on this
    # API key despite appearing in list_models(). gemini-2.5-flash confirmed
    # working on this key via direct SDK call on 2026-08-10. Matches ai.py.
    return genai.GenerativeModel("gemini-2.5-flash")

model = _get_model()


async def get_top_candidates(name: str, existing_items: list, top_k: int = 5, threshold: float = 0.75) -> List[Tuple[Any, float]]:
    name_embedding = await asyncio.to_thread(get_embedding, name)
    candidates = []
    for item in existing_items:
        if not getattr(item, "embedding", None):
            item.embedding = await asyncio.to_thread(get_embedding, item.item)
        score = cosine_similarity(name_embedding, item.embedding)
        if score >= threshold:
            candidates.append((item, score))
    candidates.sort(key=lambda x: x[1], reverse=True)
    return candidates[:top_k]

def hard_number_unit_gate(extracted_name: str, candidate_name: str) -> bool:
    """
    Returns True if the candidate passes the hard gate (no conflicting numbers/units).
    Returns False if they conflict.

    Normalizes quantity tokens through normalize_to_base so that equivalent quantities
    expressed in different units (e.g. "1kg" vs "1000g") are not wrongly flagged as a
    conflict.

    Fails CLOSED on any exception (unknown unit, cache not initialized, etc.): when in
    doubt, block the auto-path and route to human review. A false positive "needs review"
    costs a few seconds; a false pass-through risks silently merging two different items.
    """
    from app.services.units import normalize_to_base

    number_pattern = re.compile(r'(\d+(?:\.\d+)?)\s*([a-zA-Z]*)')

    def extract_base_values(name: str) -> set:
        """Returns a set of normalized base quantities parsed from a name string."""
        matches = number_pattern.findall(name.lower())
        base_values = set()
        for num_str, unit_str in matches:
            if not num_str:
                continue
            try:
                qty = float(num_str)
                base_qty, _ = normalize_to_base(qty, unit_str if unit_str else "pcs")
                # Round to 4 decimal places to avoid float comparison noise.
                base_values.add(round(base_qty, 4))
            except Exception:
                raise GateEvaluationError("Failed to normalize unit or quantity for hard gate")
        return base_values

    extracted_vals = extract_base_values(extracted_name)
    candidate_vals = extract_base_values(candidate_name)

    if extracted_vals and candidate_vals:
        # If the normalized value sets share no elements, the quantities conflict.
        if not extracted_vals.intersection(candidate_vals):
            return False
    return True

async def ai_adjudicate(extracted_name: str, quantity: float, unit: str, candidates: List[Any]) -> List[Tuple[Any, str, str]]:
    """
    Returns a list of tuples: (candidate_item, decision, reason)
    decision must be "SAME", "DIFFERENT", or "UNCERTAIN".
    """
    if not candidates:
        return []
        
    candidates_text = "\n".join([f"{i+1}. {c.item} ({c.unit})" for i, c in enumerate(candidates)])
    prompt = f"""
Extracted item: "{extracted_name}" ({quantity} {unit})
Candidate existing inventory items:
{candidates_text}

For each candidate, respond with exactly one of: SAME, DIFFERENT, UNCERTAIN, plus a one-sentence reason.
Return the result ONLY as a JSON array of objects with keys: "candidate_index" (integer, 1-indexed), "decision" (SAME, DIFFERENT, or UNCERTAIN), and "reason" (string).
    """

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                model.generate_content,
                prompt
            ),
            timeout=10.0
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        
        results = []
        for i, c in enumerate(candidates):
            decision = "UNCERTAIN"
            reason = "Failed to parse AI response"
            for item in data:
                if item.get("candidate_index") == i + 1:
                    decision = item.get("decision", "UNCERTAIN")
                    if decision not in ("SAME", "DIFFERENT", "UNCERTAIN"):
                        decision = "UNCERTAIN"
                    reason = item.get("reason", "No reason provided")
                    break
            results.append((c, decision, reason))
        return results
    except Exception as e:
        logger.error(f"AI Adjudication failed: {e}")
        # Fail safe: return UNCERTAIN for all candidates
        return [(c, "UNCERTAIN", "AI Adjudication timed out or failed") for c in candidates]

async def match_pipeline(extracted_name: str, quantity: float, unit: str, existing_items: list) -> dict:
    from app.services.units import normalize_to_base
    
    candidates_with_score = await get_top_candidates(extracted_name, existing_items)
    
    candidate_logs = []
    valid_candidates = []
    gate_error = False
    
    for c, score in candidates_with_score:
        try:
            passed_gate = hard_number_unit_gate(extracted_name, c.item)
            if passed_gate:
                valid_candidates.append(c)
            candidate_logs.append({
                "candidate_name": c.item,
                "cosine_score": float(score),
                "passed_hard_gate": passed_gate,
                "ai_decision": None,
                "ai_reason": None
            })
        except GateEvaluationError:
            gate_error = True
            candidate_logs.append({
                "candidate_name": c.item,
                "cosine_score": float(score),
                "passed_hard_gate": "error",
                "ai_decision": None,
                "ai_reason": None
            })
            break

    def emit_log(final_outcome: str):
        log_payload = {
            "event": "matching_pipeline_calibration",
            "extracted_name": extracted_name,
            "extracted_quantity": quantity,
            "extracted_unit": unit,
            "candidates": candidate_logs,
            "final_outcome": final_outcome,
        }
        logger.info(json.dumps(log_payload))
    
    if gate_error:
        emit_log("needs_review")
        # Return the best candidate from the semantic search that triggered the error
        best_c = candidates_with_score[0][0] if candidates_with_score else None
        return {"status": "needs_review", "candidate": best_c, "reason": "Could not verify unit or quantity compatibility due to an internal error — needs manual review", "score": float(candidates_with_score[0][1]) if candidates_with_score else 0.0}

    if not valid_candidates:
        emit_log("new")
        return {"status": "new", "candidate": None, "reason": "No candidates passed recall/gate", "score": 0.0}
        
    ai_results = await ai_adjudicate(extracted_name, quantity, unit, valid_candidates)
    
    for c, decision, reason in ai_results:
        for cl in candidate_logs:
            if cl["candidate_name"] == c.item:
                cl["ai_decision"] = decision
                cl["ai_reason"] = reason
                break
    
    same_results = [r for r in ai_results if r[1] == "SAME"]
    uncertain_results = [r for r in ai_results if r[1] == "UNCERTAIN"]
    
    def get_original_score(c):
        for orig_c, s in candidates_with_score:
            if orig_c.id == c.id:
                return s
        return 0.0
    
    if same_results:
        best_c, decision, reason = same_results[0]
        score = get_original_score(best_c)
        _, item_norm_unit = normalize_to_base(0.0, best_c.unit)
        _, line_norm_unit = normalize_to_base(0.0, unit)
        
        if item_norm_unit.strip().lower() != line_norm_unit.strip().lower():
            emit_log("needs_review")
            return {"status": "needs_review", "candidate": best_c, "reason": f"Unit conflict: AI said SAME, but {best_c.unit} vs {unit}. AI Reason: {reason}", "score": score}
        else:
            emit_log("exact")
            return {"status": "exact", "candidate": best_c, "reason": reason, "score": score}
            
    elif uncertain_results:
        best_c, decision, reason = uncertain_results[0]
        score = get_original_score(best_c)
        emit_log("needs_review")
        return {"status": "needs_review", "candidate": best_c, "reason": f"AI UNCERTAIN: {reason}", "score": score}
        
    else:
        emit_log("new")
        return {"status": "new", "candidate": None, "reason": "AI deemed all candidates DIFFERENT", "score": 0.0}
