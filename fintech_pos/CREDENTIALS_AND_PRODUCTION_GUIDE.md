# FinOS POS: Complete Production Credentials & Deployment Guide

This document outlines **where** and **which** credentials you need to configure to run the **FinOS India-First Financial Operating System & Restaurant POS** in full production.

---

## 1. Where to Add Credentials

All credentials are centrally managed in a single environment file located at:

```
fintech_pos/.env
```

A fully documented template is also provided in the repository at:
```
fintech_pos/.env.example
```

> [!NOTE]
> FinOS includes an **automatic fallback architecture**. If any credential is left with default or dummy placeholders, the application will **never crash**; instead, it automatically engages safe sandbox simulation mode. As soon as you add real credentials to `.env` and restart the backend, live external API calls are immediately enabled.

---

## 2. Complete Inventory of Production Credentials

Here is the exact mapping of every environment variable in `fintech_pos/.env`:

| # | Variable Name | Purpose | Example Value | Where to Get It |
|---|---|---|---|---|
| **1** | `PAYMENT_GATEWAY` | Active Payment Provider | `paypal` (or `decentro`) | Set to `paypal` |
| **2** | `PAYPAL_BASE_URL` | Gateway Base Endpoint | `https://mockgateway.com/api/base/paypal-1bse7u` or `https://api-m.paypal.com` | Set custom/mock gateway or default PayPal URL |
| **3** | `PAYPAL_MODE` | PayPal Environment | `sandbox` or `live` | PayPal Developer Dashboard |
| **4** | `PAYPAL_CLIENT_ID` | PayPal REST App Client ID | `AVqQTI1s5wm...` | PayPal Developer Dashboard or MockGateway |
| **5** | `PAYPAL_CLIENT_SECRET` | PayPal REST App Secret Key | `mwbyI67Ib...` | PayPal Developer Dashboard or MockGateway |
| **6** | `PAYPAL_CURRENCY` | Default Order Currency | `USD`, `EUR`, `GBP`, `INR` | Store Currency Preference |
| **7** | `PAYPAL_WEBHOOK_ID` | PayPal Webhook Identifier | `wh_mockgateway_paypal_1bse7u` | Webhook Settings |
| **7** | `DATABASE_URL` | High-concurrency SQL database | `postgresql+asyncpg://user:pass@host:5432/finos_prod` | AWS RDS, Supabase, Neon, or local PostgreSQL |
| **8** | `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Cloud Phone ID | `109827364510293` | Meta for Developers |
| **9** | `WHATSAPP_ACCESS_TOKEN` | Meta Graph API Access Token | `EAAG...` (System User Token) | Meta Business Manager |
| **10** | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Webhook challenge handshake token | Custom string (e.g. `finos_wa_2026`) | Meta Webhook Config |
| **11** | `SETU_AA_CLIENT_ID` | Setu Account Aggregator Client ID | `fiu_client_xxxx` | Setu Developer Hub |
| **12** | `SETU_AA_CLIENT_SECRET` | Setu AA Client Secret | `fiu_sec_xxxx` | Setu Developer Hub |
| **13** | `SETU_AA_PRODUCT_ID` | Setu AA Product Instance ID | `prod_inst_xxxx` | Setu Developer Hub |
| **14** | `SETU_AA_BASE_URL` | Setu FIU base endpoint | `https://fiu.setu.co` | Setu Developer Hub |
| **15** | `DEFAULT_MERCHANT_GSTIN` | Legal 15-digit GSTIN / Tax ID | `27AAACW1234F1Z5` | Tax Portal / Registration |
| **16** | `DEFAULT_STORE_NAME` | Merchant Trading Name | `Royal Indian Biryani & Cafe` | Merchant Entity |
| **17** | `DEFAULT_STORE_ADDRESS` | Physical Store Address | `Shop 14, Sector 18, Pune, MH` | Store Address |
| **18** | `DEFAULT_MERCHANT_VPA` | Merchant Virtual Payment Address | `royalbiryani@icici` | UPI Bank Account (if used) |
| **19** | `EXPO_PUBLIC_API_URL` | Frontend client backend base URL | `https://api.yourdomain.com` | Production domain or `http://localhost:8000` |

---

## 3. Step-by-Step Vendor Onboarding & Registration

### A. PayPal REST API v2 (Orders v2, Tabletop QR & Webhooks)
1. **Sign In**: Navigate to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications).
2. **Create REST API App**:
   - Go to **Apps & Credentials**.
   - Toggle between **Sandbox** (for testing) or **Live** (for real merchant production).
   - Click **Create App**, select **Merchant** as the App Type, and name it (e.g. `FinOS POS App`).
3. **Copy Credentials**:
   - Copy the generated **Client ID** &rarr; `PAYPAL_CLIENT_ID`.
   - Click **Show Secret** and copy the **Secret Key** &rarr; `PAYPAL_CLIENT_SECRET`.
   - Set `PAYPAL_MODE=live` when going to production (`sandbox` for testing).
   - Set `PAYPAL_CURRENCY=USD` (or your preferred currency: `EUR`, `GBP`, `CAD`, `AUD`, `INR`, etc.).
4. **Configure Webhook**:
   - In your PayPal App settings, scroll down to **Webhooks** and click **Add Webhook**.
   - **Webhook URL**:
     ```
     https://<your-domain>/api/v1/fintech/paypal/webhook
     ```
   - **Event Types to Subscribe**:
     - `Checkout order approved` (`CHECKOUT.ORDER.APPROVED`)
     - `Payment capture completed` (`PAYMENT.CAPTURE.COMPLETED`)
     - `Payment capture denied` (`PAYMENT.CAPTURE.DENIED`)
   - Copy the generated **Webhook ID** &rarr; `PAYPAL_WEBHOOK_ID`.

---

### B. Decentro FinTech API (Alternative UPI Gateway)
*(Optional fallback if switching back to Indian UPI rails)*
1. **Sign Up**: Navigate to [Decentro Developer Portal](https://admin.decentro.tech).
2. **KYC Verification**: Submit your business PAN, GSTIN, and Bank Account details for merchant approval.
3. **Activate Modules**: Enable **UPI Collections** and **Credit Line on UPI**.
4. **Retrieve API Keys**: In the Decentro Dashboard, copy Client ID, Secret, Module Secret, and Provider Secret.
5. **Configure Webhook**: Set callback URL to `https://<your-domain>/api/v1/fintech/upi/webhook`.

---

### B. Meta WhatsApp Business Cloud API (Paperless E-Invoicing)
1. **Sign Up / Login**: Go to [Meta for Developers](https://developers.facebook.com).
2. **Create Business App**:
   - Select **App Type: Business**.
   - Add the **WhatsApp** product.
3. **Register WhatsApp Business Number**:
   - Link a dedicated phone number (must not be active on consumer WhatsApp).
   - In **WhatsApp > API Setup**, copy:
     - `Phone Number ID` &rarr; `WHATSAPP_PHONE_NUMBER_ID`
4. **Generate Permanent Access Token**:
   - In **Meta Business Suite > System Users**, create a System User with `whatsapp_business_messaging` permissions.
   - Generate a permanent token &rarr; `WHATSAPP_ACCESS_TOKEN`.
5. **Configure Inbound Webhook**:
   - Under **WhatsApp > Configuration > Webhook**:
     - Callback URL: `https://<your-domain>/api/v1/notifications/whatsapp-webhook`
     - Verify Token: Enter the value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (e.g. `finos_wa_verify_token_2026`).
     - Click **Verify and Save**.
     - Subscribe to the `messages` event.

---

### C. Setu Account Aggregator Gateway (ReBIT Bank Reconciliation)
1. **Sign Up**: Visit [Setu Developer Hub](https://setu.co/data/account-aggregator).
2. **FIU Onboarding**:
   - Register your organization as a Financial Information User (FIU).
   - Choose your certified Account Aggregator partners (OneMoney, Anumati, Finvu, etc.).
3. **API Keys**:
   - Under App Management, copy:
     - `SETU_AA_CLIENT_ID`
     - `SETU_AA_CLIENT_SECRET`
     - `SETU_AA_PRODUCT_ID`
4. **Endpoint**:
   - Sandbox: `https://fiu-uat.setu.co`
   - Production: `https://fiu.setu.co`

---

### D. Production Database (PostgreSQL Migration)
For production deployments, replace the default SQLite file with a managed PostgreSQL instance:
1. Provision a PostgreSQL instance (AWS RDS, Supabase, Neon, or GCP Cloud SQL).
2. Set `DATABASE_URL` in `fintech_pos/.env`:
   ```bash
   DATABASE_URL=postgresql+asyncpg://postgres:YourSecurePassword123@db.yourdomain.com:5432/finos_prod
   ```
3. FinOS automatically runs table schema migrations (`init_db()`) on startup, creating all tables:
   - `invoices`
   - `invoice_items`
   - `audit_logs`
   - `ca_sessions`

---

## 4. How to Verify & Launch

### Quick Local Verification:
Run the comprehensive Pytest integration test suite:
```powershell
python -m pytest backend/tests/test_fastapi_endpoints.py
```
Expected output: **8 passed in ~2.5s (100% pass rate)**.

### Starting FinOS:
Run the automated launcher:
```powershell
.\start_all.ps1
```
Or start each service manually:
1. **Backend Server**:
   ```powershell
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **POS Frontend**:
   ```powershell
   npx expo start --web --port 8082
   ```

### Access Points:
- **POS Master Register**: `http://localhost:8082`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **CA Audit Dashboard**: `http://localhost:8000/ca-portal`
- **System Health Check**: `http://localhost:8000/health`
