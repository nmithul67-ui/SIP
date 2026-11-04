 You are a Principal Systems Reliability Engineer (SRE), Security Architect, and Full-Stack Field Deployment Specialist.

We are completing Phase 5 (System Hardening, Field Testing, Pilot Deployment, and Final Defense Deliverables) of a resilient, India-first Financial Operating System targeted at food-and-beverage MSMEs (standalone restaurants and bakeries) operating on budget 10.1-inch Android tablets. This ties together the local-first POS engine, recipe stock deduction, P2P mesh sync, GST/compliance engine, and fintech rails built across Phases 1 through 4.

Skip abstract theoretical unit tests and boilerplate placeholder code. Deliver concrete, production-grade diagnostic scripts, failover recovery procedures, release optimization configurations, benchmark collectors, and presentation-ready audit report generators.

---

### 1. TECHNICAL SCOPE & PRODUCTION GOALS
- Target Hardware: Budget 10.1-inch Android POS tablets (quad-core ARM, 2GB–4GB RAM, Android 11–14)
- Local Layer: RxDB v15+ on SQLite (`expo-sqlite`), Yjs CRDTs, Ditto Edge SDK mesh sync
- Cloud Layer: FastAPI (Python 3.11+), Supabase / PostgreSQL, Redis, Decentro UPI, Setu Account Aggregator
- Primary Focus:
  - Zero transaction loss under catastrophic network cuts and router resets
  - Sub-50ms UI response times during sustained 500+ bill peak hours
  - Tamper-proof offline audit logging and conflict-free multi-tablet reconciliation
  - Automated field trial performance benchmarking and project defense analytics

---

### 2. CORE DELIVERABLES: PHASE 5

#### A. Edge Stress-Testing & Network Failover Simulation
- Build an automated Chaos Simulator script (`scripts/chaos_network_test.py` / `testMeshResilience.ts`) to stress-test the system:
  - Simulates sudden Wi-Fi router dropouts while 3 tablet devices simultaneously punch 50 bills on identical tables.
  - Verifies Yjs CRDT state convergence: ensures zero duplicate line items, zero dropped KOTs, and identical grand totals across all devices after network reconnection.
  - Measures transaction commit latency under zero-connectivity conditions to guarantee sub-5ms local writes.
- Edge Case Disaster Recovery:
  - Implement a SQLite WAL (Write-Ahead Logging) recovery worker that automatically cleans up uncommitted drafts during a sudden device battery depletion or crash, without corrupting the local `bills` or `gst_tax_ledger` tables.

#### B. Android Release Optimization & Hardware Footprint Reduction
- Configure production Android ProGuard and Hermes engine settings (`android/app/build.gradle` and `metro.config.js`) to:
  - Optimize memory allocation on 2GB RAM budget tablets.
  - Keep heap memory usage under 180MB during sustained 8-hour cashier shifts.
  - Minimize APK size and boot time (cold start under 1.8 seconds).
- Configure persistent kiosk mode flags (screen pinning, immersive sticky full-screen, hardware volume button lock) to prevent staff from accidentally exiting the POS interface during busy service hours.

#### C. Field Pilot Deployment Instrumentation
- Build an on-device local telemetry logger (`src/services/FieldTelemetry.ts`) that runs silently without internet:
  - Tracks key operational metrics:
    - Average time taken per bill checkout (in seconds)
    - Total raw materials automatically deducted vs. manual stock adjustments
    - Number of WhatsApp digital invoices dispatched vs. paper receipts printed
    - Network status transitions (offline seconds vs. online sync seconds)
- Implement a one-tap secure cloud export (`POST /api/v1/telemetry/sync`) that aggregates pilot metrics to the central PostgreSQL database once a hotspot or Wi-Fi connection is detected.

#### D. Live Demonstration Mode & Academic Defense Dashboard
- Build a dedicated `DemoModeManager.tsx` module for evaluator presentations:
  - One-click trigger that loads realistic seed data (sample restaurant menu with 30 items, calibrated recipe ingredients, and 3 active table orders).
  - Live "Router Kill" simulation toggle directly on the tablet screen: visually displays mesh packet hopping via Bluetooth/LAN and proves continuous offline billing while disconnected from the cloud.
- Generate an automated Evaluation Summary Generator (`backend/services/defense_report.py`):
  - Ingests pilot transaction logs and compiles a formatted statistical evaluation sheet:
    - Hours saved per week on CA bookkeeping reconciliation
    - Percentage reduction in daily inventory wastage (recipe engine accuracy)
    - Cost savings from paperless WhatsApp invoicing (thermal roll cost reduction)
    - Full alignment report for UN SDG 13 / Industrial Clusters.

---

### 3. CODE DELIVERABLES & REPOSITORY STRUCTURE
Provide production-ready, clean, well-architected code with zero pseudo-code:
1. `scripts/chaos_network_test.ts`: Automated multi-device sync stress-tester and CRDT conflict resolution validator.
2. `tablet/src/services/FieldTelemetry.ts`: Lightweight, battery-efficient local operational metrics logger.
3. `tablet/src/screens/DemoModeManager.tsx`: Demonstration and failover simulation controller for the project defense.
4. `backend/services/defense_report.py`: Automated statistical pilot report generator producing structured JSON and formatted markdown for project documentation and evaluator scoring.
5. `android/app/proguard-rules.pro` & `android/app/build.gradle`: Hardware-optimized build configurations for low-spec Android POS tablets.