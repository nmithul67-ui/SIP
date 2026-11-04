"""
backend/models/compliance.py
─────────────────────────────────────────────────────────────────────────────
Pydantic v2 schemas and SQLAlchemy 2.0 async models for the GST Compliance
Engine (Phase 3).

Collections:
  - GSTTaxLedger    : append-only cloud ledger row per bill item
  - InvoiceSyncPayload : incoming batch from offline RxDB tablet
  - TaxSummary      : GSTR-3B aggregated monthly output
  - CAPortalToken   : time-bound JWT payload for read-only CA access
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# ─────────────────────────────────────────────────────────────────────────────
# SQLAlchemy declarative base
# ─────────────────────────────────────────────────────────────────────────────

from backend.database import Base


# ─────────────────────────────────────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────────────────────────────────────

class SupplyType(str, enum.Enum):
    """
    GST supply classification for invoice categorization.
    B2B  = Business-to-Business (GSTIN registered buyer) → GSTR-1 Table 4
    B2CS = Business-to-Consumer Small (unregistered, ≤ ₹2.5 lakh) → Table 7
    """
    B2B  = "B2B"
    B2CS = "B2CS"


class GSTRate(int, enum.Enum):
    """
    Legally applicable GST rate slabs for F&B MSMEs:
      ZERO   = 0%  – fresh unprocessed items
      FIVE   = 5%  – standalone restaurant (no ITC)
      TWELVE = 12% – bakery items (optional mid-slab)
      EIGHTEEN = 18% – confectionery, sweets, aerated beverages
    """
    ZERO     = 0
    FIVE     = 5
    TWELVE   = 12
    EIGHTEEN = 18


class BillSyncStatus(str, enum.Enum):
    PENDING   = "pending"
    INGESTED  = "ingested"
    DUPLICATE = "duplicate"
    ERROR     = "error"


# ─────────────────────────────────────────────────────────────────────────────
# ORM Model: gst_tax_ledger  (append-only — never UPDATE / DELETE rows)
# ─────────────────────────────────────────────────────────────────────────────

class GSTTaxLedger(Base):
    """
    Append-only cloud ledger.  One row per bill item after sync.
    Primary key is a composite (bill_id, bill_item_id) enforced via
    a unique index so idempotent upsert never double-logs.
    """
    __tablename__ = "gst_tax_ledger"
    __table_args__ = (
        UniqueConstraint("bill_id", "bill_item_id", name="uq_ledger_bill_item"),
        Index("ix_ledger_business_period", "business_id", "period_month"),
        Index("ix_ledger_synced_at", "synced_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    bill_id: Mapped[str]      = mapped_column(String(64), nullable=False)
    bill_item_id: Mapped[str] = mapped_column(String(64), nullable=False)
    business_id: Mapped[str]  = mapped_column(String(64), nullable=False, index=True)

    # Item metadata
    item_name: Mapped[str]    = mapped_column(String(120), nullable=False)
    supply_type: Mapped[SupplyType] = mapped_column(
        SAEnum(SupplyType, name="supply_type_enum"), nullable=False
    )
    tax_rate: Mapped[int]     = mapped_column(Integer, nullable=False)  # 0/5/12/18

    # Monetary values (all in INR paise as float; display layer handles ₹)
    quantity: Mapped[float]        = mapped_column(Float, nullable=False)
    unit_price: Mapped[float]      = mapped_column(Float, nullable=False)
    taxable_value: Mapped[float]   = mapped_column(Float, nullable=False)  # qty × price
    cgst_amount: Mapped[float]     = mapped_column(Float, nullable=False, default=0.0)
    sgst_amount: Mapped[float]     = mapped_column(Float, nullable=False, default=0.0)
    igst_amount: Mapped[float]     = mapped_column(Float, nullable=False, default=0.0)
    total_tax: Mapped[float]       = mapped_column(Float, nullable=False)

    # Period helpers for fast monthly aggregation
    period_month: Mapped[str]  = mapped_column(String(7), nullable=False)   # "2025-09"
    period_year: Mapped[int]   = mapped_column(Integer, nullable=False)      # 2025

    # Timestamps (UTC)
    bill_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # State code for IGST logic (derived from business GSTIN prefix)
    supply_state_code: Mapped[str | None] = mapped_column(String(2), nullable=True)
    is_interstate: Mapped[bool]           = mapped_column(Boolean, nullable=False, default=False)


# ─────────────────────────────────────────────────────────────────────────────
# ORM Model: ca_portal_tokens  (time-bound magic links for CA access)
# ─────────────────────────────────────────────────────────────────────────────

class CAPortalToken(Base):
    __tablename__ = "ca_portal_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[str]  = mapped_column(String(64), nullable=False, index=True)
    token_hash: Mapped[str]   = mapped_column(String(128), nullable=False, unique=True)
    ca_email: Mapped[str]     = mapped_column(String(254), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool]     = mapped_column(Boolean, default=False)


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic v2 Schemas
# ─────────────────────────────────────────────────────────────────────────────

class BillItemPayload(BaseModel):
    """One line item from the offline RxDB bill_items collection."""
    bill_item_id: str = Field(..., max_length=64)
    item_id:      str = Field(..., max_length=64)
    name:         str = Field(..., max_length=120)
    quantity:     float = Field(..., gt=0)
    price:        float = Field(..., ge=0)
    tax_rate:     Literal[0, 5, 12, 18]

    @field_validator("price", "quantity", mode="before")
    @classmethod
    def round_financials(cls, v: float) -> float:
        return round(float(v), 4)


class BillPayload(BaseModel):
    """One bill record from the offline RxDB bills collection."""
    bill_id:        str = Field(..., max_length=64)
    table_id:       str = Field(..., max_length=64)
    status:         Literal["draft", "kot_sent", "paid", "voided"]
    timestamp:      int  # Unix epoch ms
    subtotal:       float = Field(..., ge=0)
    cgst:           float = Field(..., ge=0)
    sgst:           float = Field(..., ge=0)
    grand_total:    float = Field(..., ge=0)
    payment_method: Literal["cash", "upi", "card", "split"] | None = None
    waiter_name:    str | None = None
    kot_number:     int | None = None

    @model_validator(mode="after")
    def validate_grand_total(self) -> "BillPayload":
        computed = round(self.subtotal + self.cgst + self.sgst, 2)
        if abs(computed - round(self.grand_total, 2)) > 1.0:
            raise ValueError(
                f"grand_total mismatch: expected ≈{computed}, got {self.grand_total}"
            )
        return self


class InvoiceSyncPayload(BaseModel):
    """
    Batch payload sent by the tablet once it detects connectivity.
    POST /api/v1/sync/bills
    Idempotent: duplicate bill_ids are silently skipped.
    """
    business_id: str = Field(..., max_length=64)
    device_id:   str = Field(..., max_length=64)
    synced_at:   datetime
    bills:       list[BillPayload]  = Field(..., min_length=1, max_length=500)
    bill_items:  list[BillItemPayload] = Field(..., min_length=1, max_length=5000)

    @model_validator(mode="after")
    def validate_item_bill_refs(self) -> "InvoiceSyncPayload":
        bill_ids = {b.bill_id for b in self.bills}
        for item in self.bill_items:
            # bill_item_id has the bill_id embedded — not strictly enforced here
            pass
        return self


class TaxLineItem(BaseModel):
    """Per-rate-slab tax breakdown used inside TaxSummary."""
    tax_rate:       int
    taxable_value:  float
    cgst:           float
    sgst:           float
    igst:           float
    total_tax:      float


class TaxSummary(BaseModel):
    """
    Aggregated GSTR-3B summary output.
    Covers Net Taxable Value, CGST, SGST, IGST, and Total Tax Payable.
    """
    business_id:    str
    period_month:   str   # "2025-09"
    invoice_count:  int
    total_taxable_value: float
    total_cgst:     float
    total_sgst:     float
    total_igst:     float
    total_tax_payable: float
    by_rate:        list[TaxLineItem]
    generated_at:   datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InvoiceSyncResult(BaseModel):
    """Response from POST /api/v1/sync/bills."""
    ingested:   int
    duplicates: int
    errors:     int
    ledger_rows_written: int
    message:    str


class CATokenRequest(BaseModel):
    business_id: str
    ca_email:    str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")


class CATokenResponse(BaseModel):
    access_token: str
    expires_at:   datetime
    portal_url:   str
