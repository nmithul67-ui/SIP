"""
backend/models/__init__.py
─────────────────────────────────────────────────────────────────────────────
Package initialization exposing all SQLAlchemy 2.0 ORM models and Pydantic schemas.
"""

from backend.database import Base
from backend.models.compliance import (
    GSTTaxLedger,
    CAPortalToken,
    SupplyType,
    GSTRate,
    BillSyncStatus,
    BillItemPayload,
    BillPayload,
    InvoiceSyncPayload,
    TaxLineItem,
    TaxSummary,
    InvoiceSyncResult,
    CATokenRequest,
    CATokenResponse,
)
from backend.models.pos import (
    Merchant,
    Store,
    BillRecord,
    BillItemRecord,
    InventoryItemRecord,
    RecipeRecord,
)
from backend.models.fintech import (
    UPITransactionRecord,
    AAConsentRecord,
    CreditLedgerRecord,
)

__all__ = [
    "Base",
    "GSTTaxLedger",
    "CAPortalToken",
    "SupplyType",
    "GSTRate",
    "BillSyncStatus",
    "BillItemPayload",
    "BillPayload",
    "InvoiceSyncPayload",
    "TaxLineItem",
    "TaxSummary",
    "InvoiceSyncResult",
    "CATokenRequest",
    "CATokenResponse",
    "Merchant",
    "Store",
    "BillRecord",
    "BillItemRecord",
    "InventoryItemRecord",
    "RecipeRecord",
    "UPITransactionRecord",
    "AAConsentRecord",
    "CreditLedgerRecord",
]
