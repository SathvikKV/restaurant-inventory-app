"""
Inventory service — business logic for stock management.
Placeholder — implement each method with real DB operations.
"""
from typing import List, Optional


async def get_item(item_id: str, restaurant_id: str) -> Optional[dict]:
    """
    Fetch a single inventory item by id.

    TODO: Query DB, raise 404 if not found or restaurant_id mismatch.
    """
    raise NotImplementedError


async def list_items(
    restaurant_id: str,
    category: Optional[str] = None,
    status: Optional[str] = None,
    query: Optional[str] = None,
) -> List[dict]:
    """
    List inventory items with optional filters.

    TODO: DB query with WHERE clauses.
    """
    raise NotImplementedError


async def create_item(restaurant_id: str, data: dict) -> dict:
    """
    Insert a new inventory item.

    TODO: Generate id, compute initial status, persist.
    """
    raise NotImplementedError


async def update_item(item_id: str, restaurant_id: str, data: dict) -> dict:
    """
    Partial update of item metadata.

    TODO: Persist changes, recompute status if reorder/critical levels changed.
    """
    raise NotImplementedError


async def deactivate_item(item_id: str, restaurant_id: str) -> None:
    """
    Soft-delete an item.

    TODO: Set is_active = False in DB.
    """
    raise NotImplementedError


async def receive_stock(
    item_id: str,
    restaurant_id: str,
    quantity: float,
    created_by: str,
    purchase_order_id: Optional[str] = None,
    invoice_s3_key: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict:
    """
    Increase item quantity and record a StockTransaction of type "receive".

    TODO:
    1. Fetch item; validate restaurant ownership.
    2. Compute new balance.
    3. Update item.quantity.
    4. Recompute item.status.
    5. Insert StockTransaction.
    6. If purchase_order_id provided, update PO status → "delivered".
    """
    raise NotImplementedError


async def issue_stock(
    item_id: str,
    restaurant_id: str,
    quantity: float,
    destination: str,
    created_by: str,
    notes: Optional[str] = None,
) -> dict:
    """
    Decrease item quantity and record a StockTransaction of type "issue".

    TODO:
    1. Fetch item.
    2. Validate quantity ≤ item.quantity.
    3. Compute new balance.
    4. Update item.quantity and status.
    5. Insert StockTransaction.
    """
    raise NotImplementedError


async def adjust_stock(
    item_id: str,
    restaurant_id: str,
    new_quantity: float,
    reason: str,
    created_by: str,
) -> dict:
    """
    Set item quantity to an absolute new value (stock-take correction).

    TODO:
    1. Fetch item.
    2. Compute delta = new_quantity − current.
    3. Update item.quantity and status.
    4. Insert StockTransaction with the delta.
    """
    raise NotImplementedError


async def compute_days_remaining(item_id: str, restaurant_id: str) -> float:
    """
    Calculate how many days of stock remain based on average daily usage.

    days_remaining = current_quantity / avg_daily_usage

    TODO: Fetch avg_daily_usage from rolling 7-day or 30-day window of issue transactions.
    """
    raise NotImplementedError


async def recompute_status(item_id: str, restaurant_id: str) -> str:
    """
    Recompute and persist the item's status based on current quantity vs thresholds.

    Returns: "critical" | "low" | "healthy"

    TODO: Compare quantity against reorder_level and critical_level.
    """
    raise NotImplementedError
