"""
Pydantic models (DB-layer shapes) for StockTransaction (issue / receive / adjust).
Placeholder — replace with SQLAlchemy ORM models when DB is wired up.
"""
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


TransactionType = Literal["receive", "issue", "adjust", "wastage"]


class StockTransaction(BaseModel):
    """
    Immutable ledger entry for every stock movement.
    A positive delta = stock increase (receive / positive adjust).
    A negative delta = stock decrease (issue / wastage / negative adjust).
    """
    id: str
    restaurant_id: str
    item_id: str
    item_name: str
    transaction_type: TransactionType
    delta: float                      # signed quantity change
    unit: str
    balance_after: float              # running balance after this transaction
    reference_id: Optional[str] = None   # PO id, wastage id, etc.
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    destination: Optional[str] = None    # e.g. "Kitchen" for issue transactions
