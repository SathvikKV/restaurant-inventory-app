import logging
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

async def push_to_mise(action: str, item_name: str, quantity: float, unit: str,
                         recorded_by: str, **extra) -> None:
    if not settings.mise_writeback_url:
        return
    payload = {"action": action, "item_name": item_name, "quantity": quantity,
               "unit": unit, "recorded_by": recorded_by, **extra}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.mise_writeback_url,
                json=payload,
                headers={"X-Sync-Token": settings.mise_inbound_secret},
            )
            resp.raise_for_status()
    except Exception as e:
        logger.warning(f"Mise write-back failed (non-fatal): {e}")
