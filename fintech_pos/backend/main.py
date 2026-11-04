"""
backend/main.py
─────────────────────────────────────────────────────────────────────────────
FastAPI application entry point for the India-first Financial Operating System.
Registers all Phase 3 & 4 routers.

Run with:
  pip install fastapi uvicorn pydantic[email] sqlalchemy asyncpg httpx python-jose
  uvicorn backend.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.ca_portal import router as ca_router
from backend.services.whatsapp_service import whatsapp_router
from backend.services.decentro_upi import upi_router
from backend.services.paypal_service import paypal_router
from backend.services.setu_aa import aa_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""
    print("[INFO] FinOS Backend starting - initializing DB tables...")
    await init_db()
    print("[INFO] FinOS Backend DB initialized - Phase 1 to 4 active")
    yield
    print("[INFO] FinOS Backend shutting down")



app = FastAPI(
    title       = "India-first Financial Operating System — FinOS API",
    description = (
        "Phase 3: GST Compliance Engine, GSTR-1/3B, Tally XML, CA Portal\n"
        "Phase 4: WhatsApp Invoicing, Decentro UPI, Credit Line, Setu Account Aggregator"
    ),
    version     = "3.4.0",
    lifespan    = lifespan,
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

# ── CORS (allow tablet client origin) ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],   # Tighten in production
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

from backend.routers.payment_websocket import ws_router

# ── Register Routers ────────────────────────────────────────────────────────────
app.include_router(ca_router)        # POST /api/v1/ca/... (CA portal)
app.include_router(whatsapp_router)  # POST /api/v1/notifications/whatsapp-invoice
app.include_router(upi_router)       # POST /api/v1/fintech/upi/...
app.include_router(paypal_router)    # POST /api/v1/fintech/paypal/...
app.include_router(aa_router)        # POST /api/v1/fintech/aa/...
app.include_router(ws_router)        # WS /ws/payments/{table_id}



@app.get("/health", tags=["System"])
async def health() -> dict:
    return {"status": "ok", "service": "FinOS API", "version": "3.4.0"}

from fastapi.responses import RedirectResponse

@app.get("/ca-portal", include_in_schema=False)
async def ca_portal_shortcut():
    return RedirectResponse(url="/api/v1/ca/dashboard")



# ── Bill Sync Endpoint (Phase 3-A) ──────────────────────────────────────────────
from fastapi import Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db, init_db
from backend.models.compliance import InvoiceSyncPayload, InvoiceSyncResult
from backend.services.gst_engine import BillSyncService


@app.post(
    "/api/v1/sync/bills",
    response_model = InvoiceSyncResult,
    status_code    = status.HTTP_202_ACCEPTED,
    tags           = ["Bill Sync"],
    summary        = "Idempotent batch bill upload from offline RxDB tablet",
)
async def sync_bills(
    payload: InvoiceSyncPayload,
    session: AsyncSession = Depends(get_db),
) -> InvoiceSyncResult:
    """
    Accepts batched offline bill payloads once the tablet detects connectivity.
    Performs idempotent upsert into Postgres/SQLite to prevent double-logging.
    """
    business_gstin = "27AAACS1234F1Z5" # Default merchant GSTIN
    service = BillSyncService(session, business_gstin)
    return await service.ingest_payload(payload)

