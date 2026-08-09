import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, DateTime, Float, Integer, Boolean, Text, JSON, ForeignKey
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
        embedding: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

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
        source_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
        ai_match_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class StaffContact(Base):
        __tablename__ = "staff_contacts"
        __table_args__ = {"schema": schema, "extend_existing": True}

        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        name: Mapped[str] = mapped_column(String(255), nullable=False)
        phone: Mapped[str] = mapped_column(String(20), nullable=False)
        telegram_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
        role_label: Mapped[str] = mapped_column(String(50), nullable=False)
        status: Mapped[str] = mapped_column(String(30), default="pending_whatsapp_connection")
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class Recipe(Base):
        __tablename__ = "recipes"
        __table_args__ = {"schema": schema, "extend_existing": True}

        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        name: Mapped[str] = mapped_column(String(255), nullable=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class RecipeIngredient(Base):
        __tablename__ = "recipe_ingredients"
        __table_args__ = {"schema": schema, "extend_existing": True}

        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        recipe_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey(f"{schema}.recipes.id", ondelete="CASCADE"), nullable=False)
        item_name: Mapped[str] = mapped_column(String(255), nullable=False)
        quantity_per_serving: Mapped[float] = mapped_column(Float, nullable=False)
        unit: Mapped[str] = mapped_column(String(50), nullable=False)
        category: Mapped[str] = mapped_column(String(50), nullable=False)

    class InventoryTransaction(Base):
        __tablename__ = "inventory_transactions"
        __table_args__ = {"schema": schema, "extend_existing": True}

        id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        item_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
        item_name: Mapped[str] = mapped_column(String(255), nullable=False)
        action: Mapped[str] = mapped_column(String(30), nullable=False)
        quantity_delta: Mapped[float] = mapped_column(Float, nullable=False)
        resulting_qty: Mapped[float] = mapped_column(Float, nullable=False)
        unit: Mapped[str] = mapped_column(String(50), nullable=False)
        source_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
        notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
        recorded_by: Mapped[str] = mapped_column(String(255), nullable=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    result = {
        "inventory": InventoryItem,
        "purchases": Purchase,
        "issues": Issue,
        "wastage": WastageEntry,
        "item_aliases": ItemAlias,
        "confirmations": PendingConfirmation,
        "staff_contacts": StaffContact,
        "recipes": Recipe,
        "recipe_ingredients": RecipeIngredient,
        "inventory_transactions": InventoryTransaction,
    }
    _model_cache[schema] = result
    return result
