"""
Notification service — push alerts for low stock, PO decisions, and daily summaries.
"""
from typing import Optional


async def notify_low_stock(restaurant_id: str, item_name: str, days_remaining: float) -> None:
    """
    Alert the owner/manager when an item hits critical/low stock.

    TODO:
    - Determine channel (WhatsApp, push notification, in-app).
    - Look up notification preferences from Settings / User table.
    - Dispatch via appropriate provider.
    """
    raise NotImplementedError


async def notify_po_decision(
    po_id: str,
    decision: str,       # "approved" | "rejected"
    manager_user_id: str,
    notes: Optional[str] = None,
) -> None:
    """
    Notify the manager who raised a PO of the owner's approval/rejection decision.

    TODO: Send WhatsApp message or push notification.
    """
    raise NotImplementedError


async def notify_wastage_alert(
    restaurant_id: str,
    item_name: str,
    wastage_pct_above_average: float,
) -> None:
    """
    Alert when an item's wastage exceeds its historical average by a threshold.

    TODO: Implement.
    """
    raise NotImplementedError


async def send_daily_summary(restaurant_id: str) -> None:
    """
    Send a daily digest of purchases, issues, and wastage to the owner.

    TODO:
    - Aggregate yesterday's data.
    - Format a summary message.
    - Dispatch via WhatsApp / email.
    """
    raise NotImplementedError


async def send_whatsapp_message(phone: str, message: str) -> None:
    """
    Send a WhatsApp message via the Cloud API.

    TODO: Mirror mise/app/services/whatsapp.py.
    """
    raise NotImplementedError
