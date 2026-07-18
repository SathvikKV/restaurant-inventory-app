import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Float, Integer, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

_model_cache: dict = {}

def make_tenant_models(schema: str) -> dict:
    if schema in _model_cache:
        return _model_cache[schema]
    """
    Returns a dict of SQLAlchemy model classes scoped to the given schema.
    Call this once per tenant at startup or on first request.
    """

    class InventoryItem(Base):
        __tablename__ = "inventory"
        __table_args__ = {"schema": schema, "extend_existing": True}

        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        item: Mapped[str] = mapped_column(String(255), nullable=False)
        unit: Mapped[str] = mapped_column(String(50), nullable=False)
        current_qty: Mapped[float] = mapped_column(Float, default=0.0)
        previous_qty: Mapped[float] = mapped_column(Float, default=0.0)
        reorder_threshold: Mapped[float] = mapped_column(Float, default=0.0)
        category: Mapped[str] = mapped_column(String(100), nullable=True)
        last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
        previous_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
        sheets_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    class Purchase(Base):
        __tablename__ = "purchases"
        __table_args__ = {"schema": schema, "extend_existing": True}

        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        supplier: Mapped[str] = mapped_column(String(255), nullable=True)
        invoice_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
        items: Mapped[dict] = mapped_column(JSON, nullable=False)
        recorded_by: Mapped[str] = mapped_column(String(255), nullable=True)
        s3_key: Mapped[str] = mapped_column(String(500), nullable=True)
        status: Mapped[str] = mapped_column(String(50), default="active")
        source: Mapped[str] = mapped_column(String(50), default="whatsapp")
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class Issue(Base):
        __tablename__ = "issues"
        __table_args__ = {"schema": schema, "extend_existing": True}

        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        indent_number: Mapped[str] = mapped_column(String(100), nullable=True)
        outlet: Mapped[str] = mapped_column(String(255), nullable=True)
        section: Mapped[str] = mapped_column(String(255), nullable=True)
        items: Mapped[dict] = mapped_column(JSON, nullable=False)
        recorded_by: Mapped[str] = mapped_column(String(255), nullable=True)
        s3_key: Mapped[str] = mapped_column(String(500), nullable=True)
        status: Mapped[str] = mapped_column(String(50), default="active")
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class WastageEntry(Base):
        __tablename__ = "wastage"
        __table_args__ = {"schema": schema, "extend_existing": True}

        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        item: Mapped[str] = mapped_column(String(255), nullable=False)
        qty: Mapped[float] = mapped_column(Float, nullable=False)
        unit: Mapped[str] = mapped_column(String(50), nullable=False)
        reason: Mapped[str] = mapped_column(String(500), nullable=True)
        recorded_by: Mapped[str] = mapped_column(String(255), nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class ItemAlias(Base):
        __tablename__ = "item_aliases"
        __table_args__ = {"schema": schema, "extend_existing": True}

        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        alias: Mapped[str] = mapped_column(String(255), nullable=False)
        canonical_name: Mapped[str] = mapped_column(String(255), nullable=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class PendingConfirmation(Base):
        __tablename__ = "confirmations"
        __table_args__ = {"schema": schema, "extend_existing": True}

        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        extracted_name: Mapped[str] = mapped_column(String(255), nullable=False)
        candidate_name: Mapped[str] = mapped_column(String(255), nullable=True)
        score: Mapped[float] = mapped_column(Float, nullable=False)
        quantity: Mapped[float] = mapped_column(Float, nullable=False)
        unit: Mapped[str] = mapped_column(String(50), nullable=False)
        status: Mapped[str] = mapped_column(String(50), default="pending")
        source: Mapped[str] = mapped_column(String(50), default="whatsapp")
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    result = {
        "inventory": InventoryItem,
        "purchases": Purchase,
        "issues": Issue,
        "wastage": WastageEntry,
        "item_aliases": ItemAlias,
        "confirmations": PendingConfirmation,
    }
    _model_cache[schema] = result
    return result
