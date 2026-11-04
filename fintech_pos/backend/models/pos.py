"""
backend/models/pos.py
─────────────────────────────────────────────────────────────────────────────
SQLAlchemy 2.0 ORM models for Core POS Domain:
  - Merchant & Store configuration
  - Bills & Bill Items
  - Inventory Items & Recipe Deductions
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Index, UniqueConstraint, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"biz_{uuid.uuid4().hex[:8]}")
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    gstin: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    legal_name: Mapped[str] = mapped_column(String(150), nullable=False)
    trade_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    state_code: Mapped[str] = mapped_column(String(2), nullable=False, default="27") # e.g. 27 for Maharashtra
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    stores: Mapped[list["Store"]] = relationship("Store", back_populates="merchant", cascade="all, delete-orphan")


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"store_{uuid.uuid4().hex[:8]}")
    merchant_id: Mapped[str] = mapped_column(String(64), ForeignKey("merchants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vpa: Mapped[str | None] = mapped_column(String(100), nullable=True) # e.g., merchant@icici
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="stores")
    bills: Mapped[list["BillRecord"]] = relationship("BillRecord", back_populates="store", cascade="all, delete-orphan")


class BillRecord(Base):
    __tablename__ = "bills"
    __table_args__ = (
        Index("ix_bills_store_status", "store_id", "status"),
        Index("ix_bills_timestamp", "timestamp"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True) # bill_id from tablet
    store_id: Mapped[str] = mapped_column(String(64), ForeignKey("stores.id"), nullable=False)
    table_id: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="paid")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cgst: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sgst: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    igst: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    grand_total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    payment_method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    waiter_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    kot_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    store: Mapped["Store"] = relationship("Store", back_populates="bills")
    items: Mapped[list["BillItemRecord"]] = relationship("BillItemRecord", back_populates="bill", cascade="all, delete-orphan")


class BillItemRecord(Base):
    __tablename__ = "bill_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True) # bill_item_id
    bill_id: Mapped[str] = mapped_column(String(64), ForeignKey("bills.id"), nullable=False)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    tax_rate: Mapped[int] = mapped_column(Integer, nullable=False, default=5)

    bill: Mapped["BillRecord"] = relationship("BillRecord", back_populates="items")


class InventoryItemRecord(Base):
    __tablename__ = "inventory_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"inv_{uuid.uuid4().hex[:8]}")
    store_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    stock_quantity: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="kg") # kg, liters, units
    reorder_level: Mapped[float] = mapped_column(Float, nullable=False, default=5.0)
    cost_per_unit: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RecipeRecord(Base):
    __tablename__ = "recipes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"rec_{uuid.uuid4().hex[:8]}")
    menu_item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    inventory_item_id: Mapped[str] = mapped_column(String(64), ForeignKey("inventory_items.id"), nullable=False)
    quantity_required: Mapped[float] = mapped_column(Float, nullable=False)
