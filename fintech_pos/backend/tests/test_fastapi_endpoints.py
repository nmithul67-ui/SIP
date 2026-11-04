"""
backend/tests/test_fastapi_endpoints.py
─────────────────────────────────────────────────────────────────────────────
Comprehensive Pytest Integration Suite for FinOS Backend APIs (Phases 1-4).
Uses FastAPI TestClient for in-process end-to-end endpoint verification.
"""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "FinOS API"


def test_ca_portal_auth_and_exports(client):
    # Auth Token
    auth_resp = client.post("/api/v1/ca/auth", json={
        "business_id": "biz_001",
        "ca_email": "ca.verma@accountingfirm.in"
    })
    assert auth_resp.status_code == 201
    token = auth_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Metrics
    metrics_resp = client.get("/api/v1/ca/metrics/2026-09", headers=headers)
    assert metrics_resp.status_code == 200
    assert "period" in metrics_resp.json()

    # GSTR-1 JSON
    gstr1_resp = client.get("/api/v1/ca/export/gstr1?period_month=2026-09", headers=headers)
    assert gstr1_resp.status_code == 200
    assert "gstin" in gstr1_resp.json()

    # GSTR-3B CSV
    gstr3b_resp = client.get("/api/v1/ca/export/gstr3b?period_month=2026-09", headers=headers)
    assert gstr3b_resp.status_code == 200
    assert "GSTR-3B Summary Export" in gstr3b_resp.text

    # Tally XML
    tally_resp = client.get("/api/v1/ca/export/tally?period_month=2026-09", headers=headers)
    assert tally_resp.status_code == 200
    assert "<ENVELOPE>" in tally_resp.text

def test_whatsapp_invoicing(client):
    resp = client.post("/api/v1/notifications/whatsapp-invoice", json={
        "mobile_number": "+919876543210",
        "bill_id": "bill_001",
        "payment_status": "paid"
    })
    assert resp.status_code == 200
    assert resp.json()["success"] is True

def test_decentro_upi_flow(client):
    # Generate Dynamic QR
    qr_resp = client.post("/api/v1/fintech/upi/generate-qr", json={
        "bill_id": "bill_001",
        "amount": 1260.0,
        "merchant_vpa": "spicegarden@icici",
        "remarks": "Payment for POS Bill"
    })
    assert qr_resp.status_code == 200
    qr_data = qr_resp.json()
    assert qr_data["success"] is True
    assert "upi://" in qr_data["upi_link"] or "paypal.com" in qr_data["upi_link"] or "mockgateway.com" in qr_data["upi_link"]

    # Credit Checkout
    credit_resp = client.post("/api/v1/fintech/upi/credit-checkout", json={
        "bill_id": "bill_001",
        "amount": 1500.0,
        "supplier_vpa": "supplier@icici",
        "credit_account_id": "CREDIT-ACC-9988",
        "purpose": "Inventory Purchase"
    })
    assert credit_resp.status_code == 200
    assert credit_resp.json()["success"] is True

    # Credit Ledger
    ledger_resp = client.get("/api/v1/fintech/upi/credit-ledger")
    assert ledger_resp.status_code == 200
    assert isinstance(ledger_resp.json(), list)

def test_setu_aa_flow(client):
    # Consent Request
    req_resp = client.post("/api/v1/fintech/aa/consent-request", json={
        "business_id": "biz_001",
        "mobile": "9876543210",
        "from_date": "2026-09-01",
        "to_date": "2026-09-23",
        "purpose": "RECONCILIATION"
    })
    assert req_resp.status_code == 201
    handle = req_resp.json()["consent_handle"]

    # Consent Callback
    callback_resp = client.post("/api/v1/fintech/aa/consent-callback", json={
        "consent_handle": handle,
        "status": "APPROVED"
    })
    assert callback_resp.status_code == 200
    assert callback_resp.json()["status"] == "approved"

def test_idempotent_bill_sync(client):
    import time
    ts = int(time.time())
    sync_resp = client.post("/api/v1/sync/bills", json={
        "business_id": "biz_001",
        "device_id": "TAB-REST-01",
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "bills": [
            {
                "bill_id": f"bill_{ts}",
                "table_id": "T-04",
                "status": "paid",
                "timestamp": 1790172000000,
                "subtotal": 950.0,
                "cgst": 23.75,
                "sgst": 23.75,
                "grand_total": 997.50,
                "payment_method": "upi",
                "waiter_name": "Rajesh K."
            }
        ],
        "bill_items": [
            {
                "bill_item_id": f"item_T-04_{ts}",
                "item_id": "menu_001",
                "name": "Paneer Tikka",
                "quantity": 2.0,
                "price": 200.0,
                "tax_rate": 5
            }
        ]
    })
    assert sync_resp.status_code == 202
    res_data = sync_resp.json()
    assert res_data["ingested"] == 1


def test_upi_status_polling_and_webhook(client):
    bill_id = "bill_poll_test_01"
    # Status before payment
    status_resp = client.get(f"/api/v1/fintech/upi/status/{bill_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] in ("awaiting", "pending", "unpaid")

    # Update status (e.g. via reconciliation or webhook)
    update_resp = client.post(
        f"/api/v1/fintech/upi/status/{bill_id}",
        json={"status": "paid", "bank_ref": "UPI_BANK_REF_9988"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "paid"

    # Status check after reconciliation
    updated_status = client.get(f"/api/v1/fintech/upi/status/{bill_id}")
    assert updated_status.status_code == 200
    assert updated_status.json()["status"] == "paid"
    assert updated_status.json()["bank_ref"] == "UPI_BANK_REF_9988"


def test_meta_whatsapp_webhook(client):
    # Challenge verification
    verify_resp = client.get(
        "/api/v1/notifications/whatsapp-webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "finos_wa_verify_token_2026",
            "hub.challenge": "1158201444"
        }
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json() == 1158201444

    # Inbound status notification
    inbound_resp = client.post(
        "/api/v1/notifications/whatsapp-webhook",
        json={
            "object": "whatsapp_business_account",
            "entry": [{"id": "WHATSAPP_BUSINESS_ACCOUNT_ID", "changes": []}]
        }
    )
    assert inbound_resp.status_code == 200
    assert inbound_resp.json()["status"] == "received"


def test_paypal_payment_flow(client):
    bill_id = "paypal_test_bill_101"

    # 1. Create PayPal Order & Generate Scannable QR
    create_resp = client.post(
        "/api/v1/fintech/paypal/create-order",
        json={
            "bill_id": bill_id,
            "amount": 45.50,
            "currency": "USD",
            "table_id": "T-04",
            "business_name": "Royal Bistro Cafe",
            "remarks": "Table 4 Dinner"
        }
    )
    assert create_resp.status_code == 200
    order_data = create_resp.json()
    assert order_data["success"] is True
    assert order_data["order_id"] is not None
    assert "https://" in order_data["approval_url"]
    assert "qrserver.com" in order_data["qr_code_url"]

    order_id = order_data["order_id"]

    # 2. Check initial status
    poll_resp = client.get(f"/api/v1/fintech/paypal/status/{bill_id}")
    assert poll_resp.status_code == 200
    assert poll_resp.json()["status"] in ("awaiting", "pending")

    # 3. Capture PayPal Order
    capture_resp = client.post(f"/api/v1/fintech/paypal/capture-order/{order_id}")
    assert capture_resp.status_code == 200
    cap_data = capture_resp.json()
    assert cap_data["success"] is True
    assert cap_data["status"] == "COMPLETED"

    # 4. Status after capture
    updated_poll = client.get(f"/api/v1/fintech/paypal/status/{bill_id}")
    assert updated_poll.status_code == 200
    assert updated_poll.json()["status"] == "paid"

    # 5. PayPal Inbound Webhook (PAYMENT.CAPTURE.COMPLETED)
    wh_resp = client.post(
        "/api/v1/fintech/paypal/webhook",
        json={
            "event_type": "PAYMENT.CAPTURE.COMPLETED",
            "resource": {
                "id": "CAP-WH-9999",
                "custom_id": bill_id,
                "amount": {"value": "45.50", "currency_code": "USD"},
                "supplementary_data": {
                    "related_ids": {"order_id": order_id}
                }
            }
        }
    )
    assert wh_resp.status_code == 200
    assert wh_resp.json()["status"] == "SUCCESS"


