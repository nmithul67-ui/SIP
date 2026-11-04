"""
backend/services/gst_engine.py
─────────────────────────────────────────────────────────────────────────────
Phase 3-A/B/C: Indian GST calculation, GSTR-1 JSON export, and
               GSTR-3B monthly aggregation service.

GST Rate Tiers (India F&B MSME):
  ┌─────────────────────────────────────────────────┬─────────┐
  │ Business Type / Item Category                   │ GST %   │
  ├─────────────────────────────────────────────────┼─────────┤
  │ Standalone Restaurant (no ITC)                  │ 5%      │
  │ Bakery items (bread, rusk, plain biscuits)       │ 0–12%   │
  │ Confectionery / Sweets / Mithai                 │ 18%     │
  │ Aerated / Carbonated Beverages                  │ 18%     │
  │ Fresh fruit juice (non-carbonated)              │ 12%     │
  └─────────────────────────────────────────────────┴─────────┘

Inter-state supply (IGST) is triggered when the buyer's state code differs
from the merchant's state code (first 2 digits of GSTIN).
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal, Sequence

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from backend.models.compliance import (
    BillItemPayload,
    BillPayload,
    GSTTaxLedger,
    GSTRate,
    InvoiceSyncPayload,
    InvoiceSyncResult,
    SupplyType,
    TaxLineItem,
    TaxSummary,
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _state_code_from_gstin(gstin: str) -> str:
    """Extract the 2-digit state code from a 15-character GSTIN string."""
    if len(gstin) < 2:
        raise ValueError(f"Invalid GSTIN: {gstin!r}")
    return gstin[:2]


def _period_month(ts_ms: int) -> str:
    """Convert Unix epoch milliseconds → 'YYYY-MM' string."""
    dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    return dt.strftime("%Y-%m")


def _period_year(ts_ms: int) -> int:
    return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).year


def _bill_datetime(ts_ms: int) -> datetime:
    return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)


# ─────────────────────────────────────────────────────────────────────────────
# Core Tax Split Calculator
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class GSTSplit:
    """Immutable result of a single GST computation."""
    taxable_value:  float
    cgst_rate:      float   # e.g. 2.5
    sgst_rate:      float   # e.g. 2.5
    igst_rate:      float   # e.g. 0.0  (only for interstate)
    cgst_amount:    float
    sgst_amount:    float
    igst_amount:    float
    total_tax:      float
    grand_total:    float
    is_interstate:  bool


def compute_gst_split(
    taxable_value: float,
    tax_rate: int,
    merchant_gstin: str,
    buyer_state_code: str | None = None,
) -> GSTSplit:
    """
    Compute CGST / SGST / IGST from the taxable value and applicable GST %.

    Args:
        taxable_value:    Base price × quantity (pre-tax)
        tax_rate:         Applicable GST slab: 0, 5, 12, or 18
        merchant_gstin:   15-char GSTIN of the selling business
        buyer_state_code: 2-digit state code of buyer (None → same-state B2CS)

    Returns:
        GSTSplit dataclass with all tax component amounts.
    """
    merchant_state = _state_code_from_gstin(merchant_gstin)
    is_interstate  = (
        buyer_state_code is not None
        and buyer_state_code != merchant_state
    )

    gst_decimal = tax_rate / 100.0

    if is_interstate:
        igst_amount = round(taxable_value * gst_decimal, 2)
        return GSTSplit(
            taxable_value = round(taxable_value, 2),
            cgst_rate     = 0.0,
            sgst_rate     = 0.0,
            igst_rate     = float(tax_rate),
            cgst_amount   = 0.0,
            sgst_amount   = 0.0,
            igst_amount   = igst_amount,
            total_tax     = igst_amount,
            grand_total   = round(taxable_value + igst_amount, 2),
            is_interstate = True,
        )
    else:
        # Intra-state: CGST = SGST = half of total GST
        half_rate   = gst_decimal / 2
        cgst_amount = round(taxable_value * half_rate, 2)
        sgst_amount = round(taxable_value * half_rate, 2)
        total_tax   = cgst_amount + sgst_amount
        return GSTSplit(
            taxable_value = round(taxable_value, 2),
            cgst_rate     = tax_rate / 2.0,
            sgst_rate     = tax_rate / 2.0,
            igst_rate     = 0.0,
            cgst_amount   = cgst_amount,
            sgst_amount   = sgst_amount,
            igst_amount   = 0.0,
            total_tax     = round(total_tax, 2),
            grand_total   = round(taxable_value + total_tax, 2),
            is_interstate = False,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Idempotent Cloud Sync & Ledger Writer
# ─────────────────────────────────────────────────────────────────────────────

class BillSyncService:
    """
    Handles POST /api/v1/sync/bills.
    Performs idempotent upsert into GSTTaxLedger, BillRecord, and BillItemRecord tables.
    """

    def __init__(self, session: AsyncSession, business_gstin: str):
        self.session        = session
        self.business_gstin = business_gstin

    async def ingest_payload(self, payload: InvoiceSyncPayload) -> InvoiceSyncResult:
        """
        Maps bill_items → gst_tax_ledger rows and bulk upserts.
        Returns counts of ingested / duplicate / error rows.
        """
        bill_map: dict[str, BillPayload] = {b.bill_id: b for b in payload.bills}

        rows_to_insert: list[dict] = []
        ingested = 0
        duplicates = 0
        errors = 0

        # 1. Upsert Bills & Bill Items into POS tables
        from backend.models.pos import BillRecord, BillItemRecord, Store, Merchant
        
        # Ensure default merchant/store exists if not present
        store_stmt = select(Store).where(Store.id == "store_default")
        store_obj = (await self.session.execute(store_stmt)).scalar_one_or_none()
        if not store_obj:
            merchant_stmt = select(Merchant).where(Merchant.id == payload.business_id)
            merchant_obj = (await self.session.execute(merchant_stmt)).scalar_one_or_none()
            if not merchant_obj:
                merchant_obj = Merchant(
                    id=payload.business_id,
                    name="Spice Garden Restaurant",
                    gstin=self.business_gstin,
                    legal_name="Spice Garden Foods Pvt Ltd",
                    trade_name="Spice Garden",
                    state_code=self.business_gstin[:2] if len(self.business_gstin)>=2 else "27",
                )
                self.session.add(merchant_obj)
                await self.session.flush()
            store_obj = Store(
                id="store_default",
                merchant_id=payload.business_id,
                name="Main Outlet",
            )
            self.session.add(store_obj)
            await self.session.flush()

        for bill in payload.bills:
            existing_bill = await self.session.get(BillRecord, bill.bill_id)
            if not existing_bill:
                bill_rec = BillRecord(
                    id=bill.bill_id,
                    store_id=store_obj.id,
                    table_id=bill.table_id,
                    status=bill.status,
                    timestamp=_bill_datetime(bill.timestamp),
                    subtotal=bill.subtotal,
                    cgst=bill.cgst,
                    sgst=bill.sgst,
                    igst=0.0,
                    grand_total=bill.grand_total,
                    payment_method=bill.payment_method,
                    waiter_name=bill.waiter_name,
                    kot_number=bill.kot_number,
                )
                self.session.add(bill_rec)

        # 2. Map items to Tax Ledger
        for item in payload.bill_items:
            try:
                matching_bill = payload.bills[0] if payload.bills else None
                if not matching_bill:
                    errors += 1
                    continue

                # Check if this bill item is already ingested in ledger
                stmt_check = select(GSTTaxLedger).where(
                    GSTTaxLedger.bill_id == matching_bill.bill_id,
                    GSTTaxLedger.bill_item_id == item.bill_item_id
                )
                existing_ledger = (await self.session.execute(stmt_check)).scalar_one_or_none()
                if existing_ledger:
                    duplicates += 1
                    continue

                taxable_value = round(item.price * item.quantity, 2)
                gst = compute_gst_split(
                    taxable_value    = taxable_value,
                    tax_rate         = item.tax_rate,
                    merchant_gstin   = self.business_gstin,
                    buyer_state_code = None,
                )
                ts_ms = matching_bill.timestamp

                ledger_entry = GSTTaxLedger(
                    id                  = str(uuid.uuid4()),
                    bill_id             = matching_bill.bill_id,
                    bill_item_id        = item.bill_item_id,
                    business_id         = payload.business_id,
                    item_name           = item.name,
                    supply_type         = SupplyType.B2CS,
                    tax_rate            = item.tax_rate,
                    quantity            = item.quantity,
                    unit_price          = item.price,
                    taxable_value       = gst.taxable_value,
                    cgst_amount         = gst.cgst_amount,
                    sgst_amount         = gst.sgst_amount,
                    igst_amount         = gst.igst_amount,
                    total_tax           = gst.total_tax,
                    period_month        = _period_month(ts_ms),
                    period_year         = _period_year(ts_ms),
                    bill_timestamp      = _bill_datetime(ts_ms),
                    synced_at           = datetime.now(timezone.utc),
                    supply_state_code   = self.business_gstin[:2] if len(self.business_gstin)>=2 else "27",
                    is_interstate       = gst.is_interstate,
                )
                self.session.add(ledger_entry)

                # Add BillItemRecord
                existing_item_rec = await self.session.get(BillItemRecord, item.bill_item_id)
                if not existing_item_rec:
                    item_rec = BillItemRecord(
                        id=item.bill_item_id,
                        bill_id=matching_bill.bill_id,
                        item_id=item.item_id,
                        name=item.name,
                        quantity=item.quantity,
                        price=item.price,
                        tax_rate=item.tax_rate,
                    )
                    self.session.add(item_rec)

                ingested += 1
            except Exception as e:
                errors += 1

        await self.session.commit()

        return InvoiceSyncResult(
            ingested=ingested,
            duplicates=duplicates,
            errors=errors,
            ledger_rows_written=ingested,
            message=f"Sync complete. {ingested} new rows written, {duplicates} duplicates skipped.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# GSTR-1 Export Service
# ─────────────────────────────────────────────────────────────────────────────

class GSTR1ExportService:
    """
    Generates GSTR-1 JSON conforming to the official GST Offline Tool schema.
    Covers:
      - Table 4  (B2B supplies)   — registered buyer with GSTIN
      - Table 7  (B2CS supplies)  — unregistered buyer ≤ ₹2.5 lakh
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def generate(
        self,
        business_id: str,
        business_gstin: str,
        period_month: str,   # "YYYY-MM"
        legal_name:   str,
    ) -> dict:
        """
        Returns a Python dict matching the GST Offline Tool JSON structure.
        Call json.dumps() on the output to get the downloadable file.
        """
        yyyy, mm = period_month.split("-")
        ret_period = f"{mm}{yyyy}"   # GST format: MMYYYY

        # Fetch all ledger rows for this business + period
        stmt = select(GSTTaxLedger).where(
            GSTTaxLedger.business_id  == business_id,
            GSTTaxLedger.period_month == period_month,
        )
        rows: list[GSTTaxLedger] = (await self.session.execute(stmt)).scalars().all()

        # ── Table 7: B2CS (intra-state, unregistered) ───────────────────────
        b2cs_by_rate: dict[int, dict] = {}
        b2b_invoices: list[dict]      = []

        for row in rows:
            if row.supply_type == SupplyType.B2CS:
                rate_key = row.tax_rate
                if rate_key not in b2cs_by_rate:
                    b2cs_by_rate[rate_key] = {
                        "sply_ty": "INTRA",
                        "rt":      float(rate_key),
                        "typ":     "OE",
                        "txval":   0.0,
                        "iamt":    0.0,
                        "csamt":   0.0,
                        "camt":    0.0,
                        "samt":    0.0,
                    }
                b2cs_by_rate[rate_key]["txval"] = round(b2cs_by_rate[rate_key]["txval"] + row.taxable_value, 2)
                b2cs_by_rate[rate_key]["camt"]  = round(b2cs_by_rate[rate_key]["camt"]  + row.cgst_amount,    2)
                b2cs_by_rate[rate_key]["samt"]  = round(b2cs_by_rate[rate_key]["samt"]  + row.sgst_amount,    2)

        # ── Assemble root object ─────────────────────────────────────────────
        return {
            "gstin":       business_gstin,
            "fp":          ret_period,
            "gt":          round(sum(r.taxable_value + r.total_tax for r in rows), 2),
            "cur_gt":      round(sum(r.taxable_value + r.total_tax for r in rows), 2),
            "b2b":         b2b_invoices,                  # empty unless B2B data added
            "b2cs":        list(b2cs_by_rate.values()),
            "nil":         {},
            "exp":         {},
            "cdnr":        [],
            "cdnur":       [],
            "at":          [],
            "txpd":        [],
            "hsn":         {},
            "docs": {
                "doc_det": [
                    {
                        "doc_num": 1,
                        "docs": [
                            {
                                "num":   1,
                                "to":    len(rows),
                                "totnum": len(rows),
                                "cancel":  0,
                                "net_issue": len(rows),
                            }
                        ],
                    }
                ]
            },
        }

    async def to_json_bytes(
        self,
        business_id: str,
        business_gstin: str,
        period_month:   str,
        legal_name:     str,
    ) -> bytes:
        payload = await self.generate(
            business_id, business_gstin, period_month, legal_name
        )
        return json.dumps(payload, indent=2, ensure_ascii=False).encode("utf-8")


# ─────────────────────────────────────────────────────────────────────────────
# GSTR-3B Summary Service
# ─────────────────────────────────────────────────────────────────────────────

class GSTR3BSummaryService:
    """
    Real-time tax liability aggregation for GSTR-3B monthly reconciliation.
    Returns net taxable value, CGST, SGST, IGST, and total tax payable.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_monthly_summary(
        self,
        business_id:  str,
        period_month: str,
    ) -> TaxSummary:
        """
        Aggregates gst_tax_ledger rows for the given business + period.
        Groups by tax_rate for the `by_rate` breakdown.
        """
        # Per-rate aggregation
        rate_stmt = (
            select(
                GSTTaxLedger.tax_rate,
                func.sum(GSTTaxLedger.taxable_value).label("txval"),
                func.sum(GSTTaxLedger.cgst_amount).label("cgst"),
                func.sum(GSTTaxLedger.sgst_amount).label("sgst"),
                func.sum(GSTTaxLedger.igst_amount).label("igst"),
                func.sum(GSTTaxLedger.total_tax).label("total_tax"),
                func.count().label("count"),
            )
            .where(
                GSTTaxLedger.business_id  == business_id,
                GSTTaxLedger.period_month == period_month,
            )
            .group_by(GSTTaxLedger.tax_rate)
        )

        rate_rows = (await self.session.execute(rate_stmt)).all()

        by_rate: list[TaxLineItem] = []
        total_txval = total_cgst = total_sgst = total_igst = total_tax = 0.0
        total_count = 0

        for r in rate_rows:
            by_rate.append(TaxLineItem(
                tax_rate      = r.tax_rate,
                taxable_value = round(r.txval  or 0, 2),
                cgst          = round(r.cgst   or 0, 2),
                sgst          = round(r.sgst   or 0, 2),
                igst          = round(r.igst   or 0, 2),
                total_tax     = round(r.total_tax or 0, 2),
            ))
            total_txval += r.txval   or 0
            total_cgst  += r.cgst    or 0
            total_sgst  += r.sgst    or 0
            total_igst  += r.igst    or 0
            total_tax   += r.total_tax or 0
            total_count += r.count   or 0

        return TaxSummary(
            business_id         = business_id,
            period_month        = period_month,
            invoice_count       = total_count,
            total_taxable_value = round(total_txval, 2),
            total_cgst          = round(total_cgst,  2),
            total_sgst          = round(total_sgst,  2),
            total_igst          = round(total_igst,  2),
            total_tax_payable   = round(total_tax,   2),
            by_rate             = sorted(by_rate, key=lambda x: x.tax_rate),
        )

    async def to_csv_bytes(
        self,
        business_id:  str,
        period_month: str,
    ) -> bytes:
        """Export GSTR-3B summary as a UTF-8 encoded CSV for download."""
        summary = await self.get_monthly_summary(business_id, period_month)
        lines = [
            "GSTR-3B Summary Export",
            f"Business ID,{summary.business_id}",
            f"Period,{summary.period_month}",
            f"Invoice Count,{summary.invoice_count}",
            "",
            "Rate Slab,Taxable Value (₹),CGST (₹),SGST (₹),IGST (₹),Total Tax (₹)",
        ]
        for slab in summary.by_rate:
            lines.append(
                f"{slab.tax_rate}%,"
                f"{slab.taxable_value:.2f},{slab.cgst:.2f},{slab.sgst:.2f},"
                f"{slab.igst:.2f},{slab.total_tax:.2f}"
            )
        lines += [
            "",
            f"TOTAL,{summary.total_taxable_value:.2f},"
            f"{summary.total_cgst:.2f},{summary.total_sgst:.2f},"
            f"{summary.total_igst:.2f},{summary.total_tax_payable:.2f}",
        ]
        return "\n".join(lines).encode("utf-8-sig")   # BOM for Excel compatibility
