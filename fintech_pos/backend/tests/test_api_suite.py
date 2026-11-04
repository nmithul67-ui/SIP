"""
backend/tests/test_api_suite.py
─────────────────────────────────────────────────────────────────────────────
Integration test suite for all Phase 3 & Phase 4 FinOS Backend APIs.
Executes live HTTP calls against http://localhost:8000.
"""

import sys
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone

BASE_URL = "http://localhost:8000"

def make_request(method: str, path: str, body: dict = None, headers: dict = None):
    url = f"{BASE_URL}{path}"
    headers = headers or {}
    data = None
    if body:
        data = json.dumps(body).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.status
            resp_bytes = resp.read()
            resp_str = resp_bytes.decode('utf-8')
            content_type = resp.headers.get('Content-Type', '')
            if 'application/json' in content_type:
                return status_code, json.loads(resp_str)
            else:
                return status_code, resp_str
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body

def run_tests():
    print("=" * 70)
    print(" RUNNING FINOS PHASE 3 & 4 END-TO-END API TEST SUITE")
    print("=" * 70)
    passed = 0
    total = 0

    def assert_test(name: str, condition: bool, details: str = ""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] {name}")
        else:
            print(f"  [FAIL] {name} - {details}")

    # 1. Health Check
    code, res = make_request("GET", "/health")
    assert_test("GET /health", code == 200 and isinstance(res, dict) and res.get("status") == "ok", f"Got {code}: {res}")

    # 2. CA Portal Token Generation
    code, res = make_request("POST", "/api/v1/ca/auth", {
        "business_id": "biz_001",
        "ca_email": "ca.verma@accountingfirm.in"
    })
    assert_test("POST /api/v1/ca/auth", code == 201 and isinstance(res, dict) and "access_token" in res, f"Got {code}: {res}")
    token = res.get("access_token", "") if isinstance(res, dict) else ""

    headers = {"Authorization": f"Bearer {token}"} if token else {}

    # 3. CA Portal Aggregate Metrics
    code, res = make_request("GET", "/api/v1/ca/metrics/2026-09", headers=headers)
    assert_test("GET /api/v1/ca/metrics/2026-09", code == 200 and isinstance(res, dict) and "period" in res, f"Got {code}: {res}")

    # 4. CA Portal GSTR-1 Return JSON
    code, res = make_request("GET", "/api/v1/ca/export/gstr1?period_month=2026-09", headers=headers)
    assert_test("GET /api/v1/ca/export/gstr1", code == 200 and isinstance(res, dict) and "gstin" in res, f"Got {code}: {res}")

    # 5. CA Portal GSTR-3B Summary CSV
    code, res = make_request("GET", "/api/v1/ca/export/gstr3b?period_month=2026-09", headers=headers)
    assert_test("GET /api/v1/ca/export/gstr3b", code == 200 and isinstance(res, str) and "GSTR-3B Summary Export" in res, f"Got {code}: {res}")

    # 6. CA Portal Tally XML Download
    code, res = make_request("GET", "/api/v1/ca/export/tally?period_month=2026-09", headers=headers)
    is_xml = code == 200 and isinstance(res, str) and "<ENVELOPE>" in res
    assert_test("GET /api/v1/ca/export/tally", is_xml, f"Got {code}, content length: {len(res) if isinstance(res, str) else 0}")

    # 7. WhatsApp Invoicing
    code, res = make_request("POST", "/api/v1/notifications/whatsapp-invoice", {
        "mobile_number": "+919876543210",
        "bill_id": "bill_001",
        "payment_status": "unpaid"
    })
    assert_test("POST /api/v1/notifications/whatsapp-invoice", code == 200 and isinstance(res, dict) and res.get("success") is True, f"Got {code}: {res}")

    # 8. Decentro UPI Dynamic QR Generation
    code, res = make_request("POST", "/api/v1/fintech/upi/generate-qr", {
        "bill_id": "bill_001",
        "amount": 1260.0,
        "merchant_vpa": "spicegarden@icici",
        "remarks": "Payment for POS Bill"
    })
    assert_test("POST /api/v1/fintech/upi/generate-qr", code == 200 and isinstance(res, dict) and res.get("success") is True, f"Got {code}: {res}")

    # 9. Decentro Credit Line on UPI Checkout
    code, res = make_request("POST", "/api/v1/fintech/upi/credit-checkout", {
        "bill_id": "bill_001",
        "amount": 1500.0,
        "supplier_vpa": "supplier@icici",
        "credit_account_id": "CREDIT-ACC-9988",
        "purpose": "Inventory Purchase"
    })
    assert_test("POST /api/v1/fintech/upi/credit-checkout", code == 200 and isinstance(res, dict) and res.get("success") is True, f"Got {code}: {res}")

    # 10. Decentro Credit Ledger Retrieval
    code, res = make_request("GET", "/api/v1/fintech/upi/credit-ledger")
    assert_test("GET /api/v1/fintech/upi/credit-ledger", code == 200 and isinstance(res, list), f"Got {code}: {res}")

    # 11. Setu Account Aggregator Consent Request
    code, res = make_request("POST", "/api/v1/fintech/aa/consent-request", {
        "business_id": "biz_001",
        "mobile": "9876543210",
        "from_date": "2026-09-01",
        "to_date": "2026-09-23",
        "purpose": "RECONCILIATION"
    })
    assert_test("POST /api/v1/fintech/aa/consent-request", code == 201 and isinstance(res, dict) and "consent_handle" in res, f"Got {code}: {res}")
    consent_handle = res.get("consent_handle", "CH-STUB") if isinstance(res, dict) else "CH-STUB"

    # 12. Setu Account Aggregator Consent Callback
    code, res = make_request("POST", "/api/v1/fintech/aa/consent-callback", {
        "consent_handle": consent_handle,
        "status": "APPROVED"
    })
    assert_test("POST /api/v1/fintech/aa/consent-callback", code == 200 and isinstance(res, dict) and res.get("status") == "approved", f"Got {code}: {res}")

    # 13. Idempotent Bill Sync
    code, res = make_request("POST", "/api/v1/sync/bills", {
        "business_id": "biz_001",
        "device_id": "TAB-REST-01",
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "bills": [
            {
                "bill_id": "bill_001",
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
                "bill_item_id": "item_T-04_001",
                "item_id": "menu_001",
                "name": "Paneer Tikka",
                "quantity": 2.0,
                "price": 200.0,
                "tax_rate": 5
            }
        ]
    })
    assert_test("POST /api/v1/sync/bills", code == 202 and isinstance(res, dict) and res.get("ingested") == 1, f"Got {code}: {res}")

    print("=" * 70)
    print(f" TEST SUMMARY: {passed} / {total} PASSED")
    print("=" * 70)
    if passed == total:
        print(" ALL TESTS PASSED SUCCESSFULLY!")
        return 0
    else:
        print(" SOME TESTS FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())
