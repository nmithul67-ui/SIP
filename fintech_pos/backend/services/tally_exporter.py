"""
backend/services/tally_exporter.py
─────────────────────────────────────────────────────────────────────────────
Phase 3-C: Tally Prime-compatible XML Sales Voucher generator.

Produces a valid ENVELOPE > BODY > DATA > TALLYMESSAGE XML file containing
complete VOUCHER definitions (type "Sales") with:
  - Bill date, voucher number, ledger postings
  - Split tax sub-ledgers: CGST @ X%, SGST @ X% per rate slab
  - Narration with bill ID and table info

Compatible with: Tally Prime 3.x / Tally ERP 9 (TDL XML Voucher standard).
"""

from __future__ import annotations

import textwrap
from datetime import datetime, timezone
from typing import Sequence
from xml.etree.ElementTree import (
    Element,
    SubElement,
    tostring,
    indent,
)

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.compliance import GSTTaxLedger, SupplyType


# ─────────────────────────────────────────────────────────────────────────────
# Tally date format helper
# ─────────────────────────────────────────────────────────────────────────────

def _tally_date(dt: datetime) -> str:
    """Convert datetime → Tally date format: YYYYMMDD"""
    return dt.strftime("%Y%m%d")


def _inr(value: float) -> str:
    """Format float as Indian currency string: '1234.56'"""
    return f"{value:.2f}"


# ─────────────────────────────────────────────────────────────────────────────
# Tally XML Export Service
# ─────────────────────────────────────────────────────────────────────────────

class TallyXMLExportService:
    """
    Generates a valid Tally Prime ENVELOPE XML from gst_tax_ledger rows.
    Each bill becomes one VOUCHER of type "Sales".

    Ledger naming conventions (must match Tally company configuration):
      - Sales Ledger  : "Sales Account"
      - Debtors/Cash  : "Cash" (B2CS default)
      - CGST Ledger   : "CGST @ {rate}%"
      - SGST Ledger   : "SGST @ {rate}%"
      - IGST Ledger   : "IGST @ {rate}%"
    """

    SALES_LEDGER   = "Sales Account"
    CASH_LEDGER    = "Cash"
    DEBTORS_LEDGER = "Sundry Debtors"

    def __init__(self, session: AsyncSession, business_name: str, business_gstin: str):
        self.session        = session
        self.business_name  = business_name
        self.business_gstin = business_gstin

    # ── Public API ────────────────────────────────────────────────────────────

    async def export_period(
        self,
        business_id:  str,
        period_month: str,   # "YYYY-MM"
    ) -> bytes:
        """
        Fetches all paid ledger rows for the period and returns UTF-8 XML bytes.
        """
        rows = await self._fetch_rows(business_id, period_month)
        xml_bytes = self._build_envelope_xml(rows, period_month)
        return xml_bytes

    # ── Fetch ─────────────────────────────────────────────────────────────────

    async def _fetch_rows(
        self, business_id: str, period_month: str
    ) -> list[GSTTaxLedger]:
        stmt = (
            select(GSTTaxLedger)
            .where(
                GSTTaxLedger.business_id  == business_id,
                GSTTaxLedger.period_month == period_month,
            )
            .order_by(GSTTaxLedger.bill_timestamp, GSTTaxLedger.bill_id)
        )
        return list((await self.session.execute(stmt)).scalars().all())

    # ── XML Builder ──────────────────────────────────────────────────────────

    def _build_envelope_xml(
        self,
        rows: list[GSTTaxLedger],
        period_month: str,
    ) -> bytes:
        """Constructs the full Tally XML envelope."""

        # Group ledger rows by bill_id
        bills: dict[str, list[GSTTaxLedger]] = {}
        for row in rows:
            bills.setdefault(row.bill_id, []).append(row)

        # Root element
        envelope = Element("ENVELOPE")

        # ── HEADER ────────────────────────────────────────────────────────────
        header = SubElement(envelope, "HEADER")
        SubElement(header, "TALLYREQUEST").text = "Import Data"

        # ── BODY ──────────────────────────────────────────────────────────────
        body = SubElement(envelope, "BODY")
        import_data = SubElement(body, "IMPORTDATA")

        req_desc = SubElement(import_data, "REQUESTDESC")
        SubElement(req_desc, "REPORTNAME").text  = "Vouchers"
        SubElement(req_desc, "STATICVARIABLES")

        req_data = SubElement(import_data, "REQUESTDATA")
        tally_msg = SubElement(req_data, "TALLYMESSAGE")
        tally_msg.set("xmlns:UDF", "TallyUDF")

        # ── VOUCHERS (one per bill) ───────────────────────────────────────────
        for voucher_num, (bill_id, bill_rows) in enumerate(bills.items(), start=1):
            self._append_voucher(tally_msg, bill_id, bill_rows, voucher_num)

        # Serialize with indentation
        indent(envelope, space="  ")
        xml_declaration = b'<?xml version="1.0" encoding="UTF-8"?>\n'
        return xml_declaration + tostring(envelope, encoding="unicode").encode("utf-8")

    def _append_voucher(
        self,
        parent:      Element,
        bill_id:     str,
        rows:        list[GSTTaxLedger],
        voucher_num: int,
    ) -> None:
        """Appends one VOUCHER element (Sales type) to the TALLYMESSAGE parent."""

        bill_date = rows[0].bill_timestamp
        total_taxable  = sum(r.taxable_value for r in rows)
        total_cgst     = sum(r.cgst_amount   for r in rows)
        total_sgst     = sum(r.sgst_amount   for r in rows)
        total_igst     = sum(r.igst_amount   for r in rows)
        grand_total    = round(total_taxable + total_cgst + total_sgst + total_igst, 2)

        voucher = SubElement(parent, "VOUCHER")
        voucher.set("REMOTEID", bill_id)
        voucher.set("VCHTYPE",  "Sales")
        voucher.set("ACTION",   "Create")

        SubElement(voucher, "DATE").text         = _tally_date(bill_date)
        SubElement(voucher, "GUID").text         = f"POS-{bill_id}"
        SubElement(voucher, "VOUCHERTYPENAME").text = "Sales"
        SubElement(voucher, "VOUCHERNUMBER").text   = str(voucher_num)
        SubElement(voucher, "PARTYLEDGERNAME").text = self.CASH_LEDGER
        SubElement(voucher, "NARRATION").text = (
            f"POS Bill: {bill_id} | GSTIN: {self.business_gstin} | "
            f"Auto-export {rows[0].period_month}"
        )
        SubElement(voucher, "ISINVOICE").text     = "Yes"
        SubElement(voucher, "ISOPTIONAL").text    = "No"

        ledger_entries = SubElement(voucher, "LEDGERENTRIES.LIST")

        # ── Debit: Cash/Debtor (grand total) ─────────────────────────────────
        self._ledger_entry(
            parent   = voucher,
            name     = self.CASH_LEDGER,
            is_debit = True,
            amount   = grand_total,
        )

        # ── Credit: Sales Account (taxable value) ────────────────────────────
        self._ledger_entry(
            parent   = voucher,
            name     = self.SALES_LEDGER,
            is_debit = False,
            amount   = total_taxable,
        )

        # ── Credit: Tax sub-ledgers (per GST rate slab) ───────────────────────
        # Group by tax_rate for clean ledger split
        rate_groups: dict[int, dict[str, float]] = {}
        for row in rows:
            rg = rate_groups.setdefault(row.tax_rate, {"cgst": 0.0, "sgst": 0.0, "igst": 0.0})
            rg["cgst"] += row.cgst_amount
            rg["sgst"] += row.sgst_amount
            rg["igst"] += row.igst_amount

        for rate, amounts in sorted(rate_groups.items()):
            half_rate = rate / 2
            if amounts["cgst"] > 0:
                self._ledger_entry(
                    parent   = voucher,
                    name     = f"CGST @ {half_rate}%",
                    is_debit = False,
                    amount   = round(amounts["cgst"], 2),
                )
            if amounts["sgst"] > 0:
                self._ledger_entry(
                    parent   = voucher,
                    name     = f"SGST @ {half_rate}%",
                    is_debit = False,
                    amount   = round(amounts["sgst"], 2),
                )
            if amounts["igst"] > 0:
                self._ledger_entry(
                    parent   = voucher,
                    name     = f"IGST @ {rate}%",
                    is_debit = False,
                    amount   = round(amounts["igst"], 2),
                )

        # ── Inventory entries (one per item) ──────────────────────────────────
        inv_entries = SubElement(voucher, "INVENTORYENTRIES.LIST")
        for row in rows:
            inv = SubElement(voucher, "INVENTORYENTRIES.LIST")
            SubElement(inv, "STOCKITEMNAME").text   = row.item_name
            SubElement(inv, "ISDEEMEDPOSITIVE").text = "No"
            SubElement(inv, "RATE").text            = _inr(row.unit_price)
            SubElement(inv, "AMOUNT").text          = _inr(-row.taxable_value)
            SubElement(inv, "ACTUALQTY").text       = f"{row.quantity} Nos"
            SubElement(inv, "BILLEDQTY").text       = f"{row.quantity} Nos"

            # GST detail on each line
            acc_info = SubElement(inv, "ACCOUNTINGALLOCATIONS.LIST")
            entry = SubElement(acc_info, "ACCOUNTINGALLOCATIONS.LIST")
            SubElement(entry, "LEDGERNAME").text      = self.SALES_LEDGER
            SubElement(entry, "ISDEEMEDPOSITIVE").text = "No"
            SubElement(entry, "AMOUNT").text          = _inr(-row.taxable_value)

    @staticmethod
    def _ledger_entry(
        parent:   Element,
        name:     str,
        is_debit: bool,
        amount:   float,
    ) -> None:
        """Appends a LEDGERENTRIES.LIST node to a voucher element."""
        entry = SubElement(parent, "LEDGERENTRIES.LIST")
        SubElement(entry, "LEDGERNAME").text       = name
        SubElement(entry, "ISDEEMEDPOSITIVE").text = "Yes" if is_debit else "No"
        # Tally convention: debit is positive, credit is negative
        tally_amount = amount if is_debit else -amount
        SubElement(entry, "AMOUNT").text           = _inr(tally_amount)
