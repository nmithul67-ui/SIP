You are a Principal Backend & FinTech Infrastructure Architect specializing in FastAPI (Python 3.11+), Indian taxation pipelines (GST/TDS), and modern financial rails (Account Aggregator, Credit Line on UPI, and automated WhatsApp communication).

We are developing Phases 3 & 4 of a resilient, India-first Financial Operating System targeted at food-and-beverage MSMEs (restaurants, bakeries, and sweet shops). This builds directly on top of the local-first POS data engine developed in Phases 1 & 2.

Skip abstract unit tests, mock frameworks, and generic placeholder logic. Deliver robust, production-grade, type-safe Python and TypeScript code designed for low-latency operational throughput and clean financial auditing.

---

### 1. TECHNICAL STACK & ARCHITECTURAL SPECS
- Backend Framework: FastAPI (Python 3.11+) with Pydantic v2 validation and SQLModel / SQLAlchemy 2.0 (Asyncpg)
- Central Cloud Database: PostgreSQL / Supabase
- Tablet Client Platform: React Native / Expo (Dev Client, TypeScript)
- External Financial Rails & Gateways:
  - Account Aggregator (AA): Setu AA Gateway integration via `react-native-webview`
  - Payments & UPI Rails: Decentro UPI API Suite (Dynamic QR, Webhook Reconciliation, and Credit Line on UPI checkout flows)
  - Paperless Invoicing: WhatsApp Business API / Twilio WhatsApp API
  - Accounting & Compliance Export: Government-compliant GSTR-1 JSON schema and Tally-compatible XML (XML Voucher standard)

---

### 2. CORE DELIVERABLES: PHASE 3 (COMPLIANCE ENGINE & READ-ONLY CA PORTAL)

#### A. Cloud Dual-Replication Ingestion Pipeline
- Build an authenticated FastAPI endpoint (`POST /api/v1/sync/bills`) accepting batched offline bill payloads from the local RxDB tablet once connectivity is detected.
- Implement an idempotent upsert mechanism to prevent double-logging of bills created during offline network periods.
- Map the incoming bill items to an append-only relational ledger table: `gst_tax_ledger`.

#### B. Indian GST Calculation & Ledger Automation
- Compute GST dynamically based on legal categorization:
  - Standalone Restaurant Sales: Flat 5% GST (2.5% CGST + 2.5% SGST, no ITC).
  - Confectionery / Sweets / Aerated Beverages: 18% GST (9% CGST + 9% SGST).
  - Inter-state vs. Intra-state split logic based on the merchant's GSTIN state code.
- Provide a summary aggregation endpoint that generates real-time tax liabilities for monthly/quarterly reconciliation (GSTR-3B summary format: Net Taxable Value, CGST, SGST, Total Tax Payable).

#### C. Government-Compliant GSTR-1 & Tally XML Generators
- `GSTR1ExportService`: Generate a clean, structural JSON payload matching the official GST Offline Tool schema for B2B (Table 4) and B2CS (Table 7) supplies.
- `TallyXMLExportService`: Generate a valid Tally Prime-compatible `ENVELOPE` > `BODY` > `DATA` > `TALLYMESSAGE` XML file containing complete sales voucher definitions (`VOUCHER` type "Sales"), complete with ledger postings, date timestamps, voucher numbers, and split tax sub-ledgers.

#### D. Read-Only CA Portal Web View (Tailwind CSS / Next.js or Jinja2)
- Build a clean, professional, enterprise-grade read-only dashboard for external Chartered Accountants:
  - Access restricted via time-bound magic link or secure credentials.
  - Displays monthly aggregate turnover, total tax liability split (CGST vs SGST), invoice counts, and audit logs.
  - One-click direct downloads: `[ Download GSTR-1 (JSON) ]`, `[ Download GSTR-3B Summary (CSV) ]`, and `[ Export to Tally (XML) ]`.

---

### 3. CORE DELIVERABLES: PHASE 4 (FINTECH RAILS & WHATSAPP AUTOMATION)

#### A. Paperless WhatsApp E-Invoicing Engine
- Implement a background invoice dispatcher (`POST /api/v1/notifications/whatsapp-invoice`):
  - Accepts customer mobile number, bill ID, and payment status.
  - Automatically compiles a localized, structured text invoice template:
    - Business Name, GSTIN, Bill Number, Date/Time
    - Itemized breakdown (Item, Qty, Price, Tax %)
    - Subtotal, CGST, SGST, Round-off, Grand Total
    - Direct payment confirmation receipt link.
  - Dispatches the payload via WhatsApp Business API / Twilio with retry handling on network failure.

#### B. Dynamic UPI QR & Credit Line on UPI Checkout Rails
- `UPIPaymentService`:
  - Integrate Decentro UPI collection endpoints to dynamically generate unique, single-use UPI QR codes linked to the merchant's Virtual Payment Address (VPA) with exact bill amounts pre-encoded.
  - Set up an asynchronous webhook listener (`POST /api/v1/webhooks/decentro-upi`) that verifies transaction signatures and automatically updates bill status from `draft` / `unpaid` to `paid`.
- Credit Line on UPI Implementation:
  - Configure checkout parameters allowing the merchant to settle supplier / inventory purchase orders using pre-sanctioned bank credit lines linked over UPI rails.
  - Implement the callback handler to log credit transactions separately in the business ledger for easy day-end repayment tracking.

#### C. Account Aggregator (AA) Integration (Setu Gateway)
- Build the secure consent journey handler:
  - Backend initiates an AA consent request (`POST /api/v1/fintech/aa/consent-request`) specifying the data range and consent purpose.
  - Frontend (`react-native-webview`) renders the Setu consent URL where the business owner enters their mobile number and approves the OTP verification from their bank (FIP).
  - An event interceptor captures the completion redirect and sends the consent ID back to the backend.
- Structured Financial Data Ingestion:
  - Implement an asynchronous worker that polls or receives webhook callbacks from the Account Aggregator network once financial data is ready.
  - Parse the standardized ReBIT bank statement format to automatically reconcile recorded daily POS sales against real bank credit deposits, flagging discrepancies.

---

### 4. CODE DELIVERABLES & REPOSITORY STRUCTURE
Provide production-ready, clean, well-architected code with zero pseudo-code:
1. `backend/models/compliance.py`: Pydantic v2 schemas and SQLAlchemy models for `GSTTaxLedger`, `InvoiceSyncPayload`, and `TaxSummary`.
2. `backend/services/gst_engine.py`: Tax split calculators and GSTR-1 / GSTR-3B data aggregation services.
3. `backend/services/tally_exporter.py`: Full XML generator producing valid Tally Prime `VOUCHER` XML.
4. `backend/routers/ca_portal.py`: Endpoints for read-only CA authentication, monthly metrics, and export file downloads.
5. `backend/services/whatsapp_service.py`: WhatsApp invoice compilation and dispatch service.
6. `backend/services/decentro_upi.py`: Dynamic UPI QR generation, webhook validation, and Credit Line on UPI handler.
7. `backend/services/setu_aa.py`: Account Aggregator consent request management and ReBIT bank statement parsing.
8. `tablet/src/screens/FintechSettlementModal.tsx`: Professional React Native modal showing Dynamic UPI QR, Credit Line on UPI selector, and WhatsApp receipt toggle.