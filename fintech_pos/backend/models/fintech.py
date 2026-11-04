"""
backend/models/fintech.py
─────────────────────────────────────────────────────────────────────────────
SQLAlchemy 2.0 ORM models for Fintech Services:
  - Decentro UPI Dynamic Transactions
  - Setu Account Aggregator Consents & Financial Records
  - Credit Line Ledger
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base


class UPITransactionRecord(Base):
    __tablename__ = "upi_transactions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    bill_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    decentro_txn_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    merchant_vpa: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING") # PENDING, SUCCESS, FAILED
    npci_txn_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bank_reference_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AAConsentRecord(Base):
    __tablename__ = "aa_consents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"aac_{uuid.uuid4().hex[:12]}")
    consent_handle: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    business_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING") # PENDING, APPROVED, REJECTED, EXPIRED
    from_date: Mapped[str] = mapped_column(String(10), nullable=False)
    to_date: Mapped[str] = mapped_column(String(10), nullable=False)
    purpose: Mapped[str] = mapped_column(String(50), nullable=False, default="RECONCILIATION")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CreditLedgerRecord(Base):
    __tablename__ = "credit_ledger"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"cred_{uuid.uuid4().hex[:12]}")
    bill_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    supplier_vpa: Mapped[str] = mapped_column(String(100), nullable=False)
    credit_account_id: Mapped[str] = mapped_column(String(64), nullable=False)
    purpose: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="APPROVED")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
