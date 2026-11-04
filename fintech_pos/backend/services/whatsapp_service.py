"""
backend/services/whatsapp_service.py
─────────────────────────────────────────────────────────────────────────────
Phase 4-A: Paperless WhatsApp E-Invoicing Engine.

Compiles a localized, structured text invoice template and dispatches it
via Twilio WhatsApp API with exponential backoff retry.

FastAPI endpoint: POST /api/v1/notifications/whatsapp-invoice
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

import httpx
from pydantic import BaseModel, Field, field_validator
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Configuration (load from env in production)
# ─────────────────────────────────────────────────────────────────────────────

# Meta WhatsApp Business Cloud API Configuration
WHATSAPP_PHONE_NUMBER_ID      = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_ACCESS_TOKEN          = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_WEBHOOK_VERIFY_TOKEN  = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "finos_wa_verify_token_2026")
META_GRAPH_API_BASE            = "https://graph.facebook.com/v20.0"

# Twilio WhatsApp Configuration (Alternative Provider)
TWILIO_ACCOUNT_SID   = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN    = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
TWILIO_API_BASE      = "https://api.twilio.com/2010-04-01"

# Retry configuration
MAX_RETRIES     = 3
RETRY_BASE_SECS = 1.5   # exponential backoff: 1.5s, 3s, 6s


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────

class WhatsAppInvoiceRequest(BaseModel):
    """Input payload for POST /api/v1/notifications/whatsapp-invoice"""
    mobile_number:  str   = Field(..., description="E.164 format, e.g. +919876543210")
    bill_id:        str
    payment_status: Literal["paid", "unpaid", "partial"]

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        v = v.strip().replace(" ", "")
        if not v.startswith("+"):
            raise ValueError("mobile_number must be in E.164 format (e.g. +919876543210)")
        if not v[1:].isdigit() or len(v) < 10:
            raise ValueError("Invalid mobile number format")
        return v


class WhatsAppDispatchResult(BaseModel):
    success:        bool
    provider:       str = "meta_cloud_api"
    message_id:     str | None = None
    twilio_sid:     str | None = None
    attempts:       int
    error_message:  str | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Invoice data structures (populated from DB in real usage)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class InvoiceLineItem:
    name:     str
    quantity: float
    price:    float
    tax_rate: int

    @property
    def base_amount(self) -> float:
        return round(self.price * self.quantity, 2)

    @property
    def cgst(self) -> float:
        return round(self.base_amount * (self.tax_rate / 2 / 100), 2)

    @property
    def sgst(self) -> float:
        return self.cgst


@dataclass
class InvoiceContext:
    bill_id:         str
    bill_number:     str         # Human-readable e.g. "INV-2025-00042"
    business_name:   str
    business_gstin:  str
    table_label:     str
    waiter_name:     str | None
    timestamp:       datetime
    items:           list[InvoiceLineItem]
    payment_status:  Literal["paid", "unpaid", "partial"]
    payment_method:  str | None = None
    receipt_link:    str | None = None   # URL to digital receipt

    @property
    def subtotal(self) -> float:
        return round(sum(i.base_amount for i in self.items), 2)

    @property
    def total_cgst(self) -> float:
        return round(sum(i.cgst for i in self.items), 2)

    @property
    def total_sgst(self) -> float:
        return round(sum(i.sgst for i in self.items), 2)

    @property
    def grand_total(self) -> float:
        return round(self.subtotal + self.total_cgst + self.total_sgst, 2)

    @property
    def round_off(self) -> float:
        rounded = round(self.grand_total)
        return round(rounded - self.grand_total, 2)


# ─────────────────────────────────────────────────────────────────────────────
# WhatsApp Invoice Compiler
# ─────────────────────────────────────────────────────────────────────────────

class WhatsAppInvoiceService:
    """
    Compiles localized WhatsApp invoice messages and dispatches
    them via Twilio API with retry logic.
    """

    def generate_pdf_receipt(self, ctx: InvoiceContext) -> bytes:
        """
        Generates a clean PDF receipt using ReportLab and returns raw bytes.
        """
        from io import BytesIO
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        styles = getSampleStyleSheet()

        elements = []
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#0F172A'),
            alignment=1
        )
        elements.append(Paragraph(ctx.business_name, title_style))
        elements.append(Paragraph(f"GSTIN: {ctx.business_gstin}", styles['Normal']))
        elements.append(Spacer(1, 10))

        elements.append(Paragraph(f"<b>Invoice #:</b> {ctx.bill_number} &nbsp;&nbsp; <b>Date:</b> {ctx.timestamp.strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
        elements.append(Paragraph(f"<b>Table:</b> {ctx.table_label} &nbsp;&nbsp; <b>Status:</b> {ctx.payment_status.upper()}", styles['Normal']))
        elements.append(Spacer(1, 15))

        # Table data
        data = [["Item Description", "Qty", "Unit Price (₹)", "Tax %", "Amount (₹)"]]
        for item in ctx.items:
            data.append([
                item.name,
                str(item.quantity),
                f"{item.price:.2f}",
                f"{item.tax_rate}%",
                f"{item.base_amount:.2f}"
            ])

        data.append(["", "", "", "Subtotal:", f"₹{ctx.subtotal:.2f}"])
        data.append(["", "", "", "CGST:", f"₹{ctx.total_cgst:.2f}"])
        data.append(["", "", "", "SGST:", f"₹{ctx.total_sgst:.2f}"])
        data.append(["", "", "", "GRAND TOTAL:", f"₹{round(ctx.grand_total):.2f}"])

        t = Table(data, colWidths=[220, 50, 90, 60, 90])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-5), 0.5, colors.HexColor('#CBD5E1')),
            ('FONTNAME', (-2,-4), (-1,-1), 'Helvetica-Bold'),
            ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("Thank you for dining with us!", styles['Italic']))

        doc.build(elements)
        buffer.seek(0)
        return buffer.read()

    def compile_invoice(self, ctx: InvoiceContext) -> str:
        """
        Returns a Unicode-safe WhatsApp-formatted invoice message string.
        Uses bullet-style layout for readability on mobile screens.
        """
        dt_str  = ctx.timestamp.strftime("%d %b %Y, %I:%M %p")
        status_emoji = {
            "paid":    "✅ PAID",
            "unpaid":  "🔴 PAYMENT PENDING",
            "partial": "🟡 PARTIAL PAYMENT",
        }.get(ctx.payment_status, ctx.payment_status.upper())

        # Header
        lines = [
            f"🧾 *{ctx.business_name}*",
            f"GSTIN: `{ctx.business_gstin}`",
            "─────────────────────────",
            f"📋 *Invoice: {ctx.bill_number}*",
            f"📅 Date: {dt_str}",
            f"🪑 Table: {ctx.table_label}",
        ]
        if ctx.waiter_name:
            lines.append(f"👨‍🍳 Served by: {ctx.waiter_name}")

        # Itemized breakdown
        lines += [
            "─────────────────────────",
            "*ITEM DETAILS*",
        ]
        for item in ctx.items:
            tax_tag = f"GST {item.tax_rate}%"
            lines.append(
                f"  • {item.name}\n"
                f"    {item.quantity} × ₹{item.price:.2f} [{tax_tag}] = *₹{item.base_amount:.2f}*"
            )

        # Tax summary
        lines += [
            "─────────────────────────",
            f"  Subtotal          : ₹{ctx.subtotal:.2f}",
            f"  CGST              : ₹{ctx.total_cgst:.2f}",
            f"  SGST              : ₹{ctx.total_sgst:.2f}",
        ]
        if ctx.round_off != 0:
            lines.append(f"  Round-off         : ₹{ctx.round_off:.2f}")

        lines += [
            "─────────────────────────",
            f"  *GRAND TOTAL      : ₹{round(ctx.grand_total + ctx.round_off):.2f}*",
            "─────────────────────────",
            f"  Status: {status_emoji}",
        ]

        if ctx.payment_method:
            lines.append(f"  Paid via: {ctx.payment_method.upper()}")

        if ctx.receipt_link:
            lines += [
                "",
                f"🔗 Digital Receipt: {ctx.receipt_link}",
            ]

        lines += [
            "",
            "_Thank you for dining with us! 🙏_",
            f"_{ctx.business_name}_",
        ]

        return "\n".join(lines)

    async def _dispatch_meta(
        self,
        mobile_number: str,
        message_body: str,
    ) -> WhatsAppDispatchResult:
        """Dispatches WhatsApp invoice via Meta WhatsApp Business Cloud API."""
        clean_num = mobile_number.replace("+", "").strip()
        url = f"{META_GRAPH_API_BASE}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_num,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message_body,
            },
        }

        attempt = 0
        last_error: str | None = None

        async with httpx.AsyncClient(timeout=10.0) as client:
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    response = await client.post(url, json=payload, headers=headers)
                    if response.status_code in (200, 201):
                        data = response.json()
                        msg_id = None
                        if data.get("messages") and len(data["messages"]) > 0:
                            msg_id = data["messages"][0].get("id")
                        logger.info(
                            "[WhatsApp-Meta] Delivered to %s — Message ID: %s (attempt %d)",
                            mobile_number, msg_id, attempt,
                        )
                        return WhatsAppDispatchResult(
                            success=True,
                            provider="meta_cloud_api",
                            message_id=msg_id,
                            attempts=attempt,
                        )
                    elif response.status_code >= 500:
                        last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                        logger.warning(
                            "[WhatsApp-Meta] Server error attempt %d/%d: %s",
                            attempt, MAX_RETRIES, last_error,
                        )
                        await asyncio.sleep(RETRY_BASE_SECS * (2 ** (attempt - 1)))
                    else:
                        last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                        logger.error("[WhatsApp-Meta] Client error: %s", last_error)
                        return WhatsAppDispatchResult(
                            success=False,
                            provider="meta_cloud_api",
                            attempts=attempt,
                            error_message=last_error,
                        )
                except httpx.TransportError as exc:
                    last_error = str(exc)
                    logger.warning("[WhatsApp-Meta] Network error attempt %d/%d: %s", attempt, MAX_RETRIES, last_error)
                    await asyncio.sleep(RETRY_BASE_SECS * (2 ** (attempt - 1)))

        return WhatsAppDispatchResult(
            success=False,
            provider="meta_cloud_api",
            attempts=attempt,
            error_message=f"Meta API delivery failed after {MAX_RETRIES} attempts. Last: {last_error}",
        )

    async def _dispatch_twilio(
        self,
        mobile_number: str,
        message_body: str,
    ) -> WhatsAppDispatchResult:
        """Dispatches WhatsApp invoice via Twilio WhatsApp API."""
        to_number = f"whatsapp:{mobile_number}"
        url       = f"{TWILIO_API_BASE}/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"

        attempt = 0
        last_error: str | None = None

        async with httpx.AsyncClient(timeout=10.0) as client:
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    response = await client.post(
                        url,
                        data={
                            "From": TWILIO_WHATSAPP_FROM,
                            "To":   to_number,
                            "Body": message_body,
                        },
                        auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                    )

                    if response.status_code in (200, 201):
                        body = response.json()
                        logger.info(
                            "[WhatsApp-Twilio] Sent to %s — SID: %s (attempt %d)",
                            mobile_number, body.get("sid"), attempt,
                        )
                        return WhatsAppDispatchResult(
                            success     = True,
                            provider    = "twilio",
                            message_id  = body.get("sid"),
                            twilio_sid  = body.get("sid"),
                            attempts    = attempt,
                        )
                    elif response.status_code >= 500:
                        last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                        logger.warning(
                            "[WhatsApp-Twilio] Server error attempt %d/%d: %s",
                            attempt, MAX_RETRIES, last_error,
                        )
                        await asyncio.sleep(RETRY_BASE_SECS * (2 ** (attempt - 1)))
                    else:
                        last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                        logger.error("[WhatsApp-Twilio] Client error: %s", last_error)
                        return WhatsAppDispatchResult(
                            success       = False,
                            provider      = "twilio",
                            attempts      = attempt,
                            error_message = last_error,
                        )
                except httpx.TransportError as exc:
                    last_error = str(exc)
                    logger.warning("[WhatsApp-Twilio] Network error attempt %d/%d: %s", attempt, MAX_RETRIES, last_error)
                    await asyncio.sleep(RETRY_BASE_SECS * (2 ** (attempt - 1)))

        return WhatsAppDispatchResult(
            success       = False,
            provider      = "twilio",
            attempts      = attempt,
            error_message = f"Twilio delivery failed after {MAX_RETRIES} attempts. Last: {last_error}",
        )

    async def dispatch(
        self,
        mobile_number: str,
        message_body:  str,
    ) -> WhatsAppDispatchResult:
        """
        Dispatches WhatsApp invoice message.
        Prioritizes Meta WhatsApp Business Cloud API.
        Falls back to Twilio if Twilio credentials exist.
        In sandbox/dev mode (no credentials or dummy tokens), logs cleanly and returns mock success.
        """
        # 1. Check for Meta WhatsApp Cloud API credentials
        has_meta = bool(
            WHATSAPP_PHONE_NUMBER_ID
            and WHATSAPP_ACCESS_TOKEN
            and not WHATSAPP_ACCESS_TOKEN.startswith("EAAG...")
            and WHATSAPP_ACCESS_TOKEN != "your_access_token"
        )
        if has_meta:
            return await self._dispatch_meta(mobile_number, message_body)

        # 2. Check for Twilio WhatsApp API credentials
        has_twilio = bool(
            TWILIO_ACCOUNT_SID
            and TWILIO_AUTH_TOKEN
            and not TWILIO_ACCOUNT_SID.startswith("your_")
            and TWILIO_ACCOUNT_SID != "AC00000000000000000000000000000000"
        )
        if has_twilio:
            return await self._dispatch_twilio(mobile_number, message_body)

        # 3. Sandbox / Mock mode for development without live keys (prevents crashing)
        logger.info(
            "[WhatsApp] Sandbox/Dry-run mode: Mocking successful delivery to %s (Length: %d chars). Configure WHATSAPP_PHONE_NUMBER_ID & WHATSAPP_ACCESS_TOKEN for live delivery.",
            mobile_number, len(message_body)
        )
        return WhatsAppDispatchResult(
            success       = True,
            provider      = "sandbox_mock",
            message_id    = f"mock_wa_{uuid.uuid4().hex[:12]}",
            attempts      = 1,
            error_message = None,
        )

    async def send_invoice(
        self,
        mobile_number: str,
        ctx:           InvoiceContext,
    ) -> WhatsAppDispatchResult:
        """Convenience method: compile + dispatch in one call."""
        message = self.compile_invoice(ctx)
        return await self.dispatch(mobile_number, message)


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Router (attach to main app)
# ─────────────────────────────────────────────────────────────────────────────

whatsapp_router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["WhatsApp Invoicing"],
)

_service = WhatsAppInvoiceService()


@whatsapp_router.post(
    "/whatsapp-invoice",
    response_model=WhatsAppDispatchResult,
    summary="Send WhatsApp e-invoice to customer",
)
async def send_whatsapp_invoice(
    req:               WhatsAppInvoiceRequest,
    background_tasks:  BackgroundTasks,
) -> WhatsAppDispatchResult:
    """
    Compiles and dispatches a structured WhatsApp invoice to the customer's
    mobile number. The actual HTTP call runs in a background task so the
    POS checkout flow returns immediately.
    """
    store_name = os.getenv("DEFAULT_STORE_NAME", "Sharma's Bistro")
    store_gstin = os.getenv("DEFAULT_MERCHANT_GSTIN", "27AABCB1234C1Z5")

    # ── Build invoice context ─────────────────────────────────────────────────
    ctx = InvoiceContext(
        bill_id        = req.bill_id,
        bill_number    = f"INV-{req.bill_id[-6:].upper()}",
        business_name  = store_name,
        business_gstin = store_gstin,
        table_label    = "T4",
        waiter_name    = "Staff",
        timestamp      = datetime.now(timezone.utc),
        items          = [
            InvoiceLineItem("Awadhi Mutton Biryani", 2, 450.00, 5),
            InvoiceLineItem("Cold Brew Citrus Tonic", 2, 170.00, 18),
        ],
        payment_status = req.payment_status,
        payment_method = "UPI",
        receipt_link   = f"https://finos.local/receipt/{req.bill_id}",
    )

    # Run dispatch in background (non-blocking POS checkout)
    async def _dispatch():
        await _service.send_invoice(req.mobile_number, ctx)

    background_tasks.add_task(_dispatch)

    # Immediate optimistic response for snappy POS UI
    return WhatsAppDispatchResult(
        success       = True,
        provider      = "meta_cloud_api" if WHATSAPP_ACCESS_TOKEN and not WHATSAPP_ACCESS_TOKEN.startswith("EAAG...") else "sandbox_mock",
        attempts      = 0,
        message_id    = f"msg_{uuid.uuid4().hex[:12]}",
        error_message = "Dispatch queued as background task.",
    )


@whatsapp_router.get(
    "/whatsapp-webhook",
    summary="Meta WhatsApp Webhook Verification Challenge",
)
async def meta_webhook_verification(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
):
    """
    Handles Meta's initial webhook verification handshake.
    Meta sends GET with hub.mode=subscribe and hub.verify_token.
    If valid, returns the hub.challenge number as plain text.
    """
    if hub_mode == "subscribe" and hub_verify_token == WHATSAPP_WEBHOOK_VERIFY_TOKEN:
        logger.info("[WhatsApp-Webhook] Meta webhook handshake verified successfully!")
        return int(hub_challenge) if hub_challenge.isdigit() else hub_challenge
    raise HTTPException(status_code=403, detail="Verification token mismatch")


@whatsapp_router.post(
    "/whatsapp-webhook",
    summary="Meta WhatsApp Inbound Status & Message Webhook",
)
async def meta_webhook_inbound(request: Request):
    """
    Receives message status updates (sent, delivered, read, failed) from Meta Cloud API.
    """
    payload = await request.json()
    logger.info("[WhatsApp-Webhook] Inbound event received: %s", payload.get("object"))
    return {"status": "received"}
