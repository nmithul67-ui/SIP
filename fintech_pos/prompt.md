You are a Principal Frontend Architect and Distributed Systems Engineer specializing in React Native, offline-first local databases, and peer-to-peer data sync.

We are building Phases 1 & 2 of a resilient, India-first Financial Operating System (POS) targeted at food-and-beverage MSMEs (standalone restaurants and bakeries) operating on budget 10.1-inch Android tablets in landscape orientation. The application must feature a clean, professional, enterprise-grade interface (comparable to modern industrial POS systems like Toast or Square) rather than a prototype look.

Skip excessive test suites, unit testing setups, and dummy mock mocks. Focus 100% of the effort on robust production code, tight schema definitions, reactive state management, reliable local transactions, and a polished, responsive UI/UX.

---

### 1. TECHNICAL STACK & CONSTRAINTS
- Platform: React Native with Expo (Dev Client / custom native build, React Native 0.74+)
- Language: TypeScript (strict mode enabled)
- UI / Styling: NativeWind (Tailwind CSS v3 for React Native) or StyleSheet with a structured Design Token System
- Icons: `lucide-react-native`
- Display Target: Fixed Landscape mode (1280x800 or 1920x1200 10.1" Android tablets)
- Core Databases & Engines:
  - Local Storage (Phase 1): RxDB (v15+) with SQLite adapter (`expo-sqlite`)
  - Mesh Sync & Networking (Phase 2): Ditto Edge SDK (`@dittolive/ditto`) and Yjs CRDTs for multi-device offline state convergence
  - State Reactivity: Fully reactive subscriptions via RxDB observables (no screen-blocking loaders, sub-5ms touch response)

---

### 2. DESIGN SYSTEM & PROFESSIONAL UI/UX SPECIFICATIONS
- Color Palette:
  - Surface Canvas: `#F4F6F9` (Slate Gray canvas to minimize eye fatigue under harsh fluorescent lighting)
  - Cards & Panels: `#FFFFFF` with micro-borders (`#E2E8F0`) and subtle elevation (`shadow-sm`)
  - Primary Brand / Actions: Deep Navy Blue `#1F497D` (primary CTA, active table highlight)
  - Offline & Resilience Badges: Emerald Green `#10B981` (Local-first active indicator, sync verified)
  - Warning / Stock Triggers: Amber Orange `#F59E0B` (low stock, held orders)
  - Danger / Deletion: Coral Red `#EF4444` (void item, order cancellation)
  - Typography Hierarchy: Slate 900 (`#0F172A`) for headers/names; Slate 500 (`#64748B`) for metadata; Monospace (`tabular-nums`) for currency amounts to eliminate layout shifts.
- Touch Targets: Minimum 48x48dp for all interactive elements. Category pills and table cards must be optimized for rapid thumb punching.

---

### 3. DATABASE SCHEMA & DATA MODEL (RxDB + CRDTs)
Define typed schemas and collections covering both Phase 1 (Billing & KOT) and Phase 2 (Recipe & Stock):

1. `business`: `business_id` (PK, string), `name` (string), `gstin` (string), `type` ('restaurant' | 'bakery').
2. `tables`: `table_id` (PK, string), `label` (string, e.g., 'T1'), `status` ('vacant' | 'occupied' | 'billed'), `active_bill_id` (string, nullable), `assigned_waiter` (string, nullable).
3. `menu_items`: `item_id` (PK, string), `name` (string), `category` (string), `price` (number), `tax_rate` (number, e.g., 5 or 18), `is_available` (boolean).
4. `ingredients`: `ingredient_id` (PK, string), `name` (string), `current_stock` (number), `unit` ('g' | 'ml' | 'units'), `min_threshold` (number).
5. `recipes`: `recipe_id` (PK, string), `menu_item_id` (FK, string), `ingredient_id` (FK, string), `quantity_required` (number).
6. `bills`: `bill_id` (PK, string), `table_id` (string), `status` ('draft' | 'kot_sent' | 'paid'), `timestamp` (number), `subtotal` (number), `cgst` (number), `sgst` (number), `grand_total` (number).
7. `bill_items`: `bill_item_id` (PK, string), `bill_id` (FK, string), `item_id` (FK, string), `name` (string), `quantity` (number), `price` (number), `tax_rate` (number).

---

### 4. CORE DELIVERABLES: PHASE 1 (LOCAL-FIRST POS & INSTANT KOT)
Build the complete landscape POS master view partitioned into 4 distinct regions:

1. Top Resilience Bar (Full width, Height: 56px):
   - Left: Brand icon, Outlet Name, and Terminal ID.
   - Center: Local-first resilience status pill (`● OFFLINE ENGINE ACTIVE | 0 ms Latency (RxDB SQLite)`).
   - Right: Sync state badge, active staff name, and live clock.

2. Left Pane: Table Grid & Workspace Switcher (Width: 26%):
   - Toggle tabs: `[ Dine-In Tables ]` | `[ Takeaway / QSR ]`.
   - Responsive grid of 12 table cards showing table ID, status pill, seated time, and current active balance.
   - Category filter pills below table grid (`All`, `Biryani`, `South Indian`, `Bakery`, `Beverages`).

3. Center Pane: Fast Menu Catalog (Width: 42%):
   - Touch-friendly search bar with `(F1)` shortcut hint.
   - Grid of menu item cards displaying item title, GST tag (5% / 18%), formatted price (`₹XXX.XX`), and an item counter badge.
   - Single tap directly increments the item count on the active order; changes reflect in under 5 milliseconds.

4. Right Pane: Active Order, Line Items & Checkout (Width: 32%):
   - Table header (`Order: Table T4 - Dine-In`) with clear/void action.
   - Scrollable line-item cart with touch stepper buttons `[ - ]` `[ Qty ]` `[ + ]`, tax rate pill, and line-item total.
   - Tax & Total Summary: Automatic split calculation of Subtotal, CGST (2.5%), SGST (2.5%), and High-Contrast Grand Total.
   - Actions: `[ Print / Send KOT ]` (formats KOT payload and marks status `kot_sent`), `[ Hold ]`, and prominent `[ Quick Pay / Checkout ]`.

---

### 5. CORE DELIVERABLES: PHASE 2 (RECIPE-LEVEL INVENTORY & P2P MESH SYNC)
Implement the automated operational and networking layers:

1. Automated Recipe-to-Stock Deduction Engine:
   - Provide a transaction helper: when a bill transitions to `paid`, query all associated `bill_items`, resolve their `recipes`, and execute atomic batch decrements on the respective `ingredients.current_stock`.
   - If stock falls below `min_threshold`, dynamically highlight the ingredient with a low-stock alert pill in the UI.
   - Add a direct stock view drawer/modal displaying live ingredient levels and recent automatic consumption logs.

2. P2P Mesh Sync Integration (Ditto Edge SDK + Yjs):
   - Initialize the Ditto peer-to-peer mesh sync layer to automatically discover sibling POS tablets and mobile ordering devices over Bluetooth Low Energy (BLE) and Local Area Network (LAN) without requiring internet access or a central cloud server.
   - Ensure table states and active orders sync between devices. Use Yjs CRDT logic to merge concurrent edits to the same table invoice cleanly without duplicating items or dropping edits.

---

### 6. CODE STRUCTURE REQUIREMENTS
Deliver clean, modular TypeScript code with zero placeholder pseudo-code for the calculation, inventory deduction, and data-binding logic:
- `src/database/schema.ts`: Complete RxDB typed schemas.
- `src/database/index.ts`: Database initialization singleton ensuring local SQLite persistence.
- `src/services/inventoryEngine.ts`: Atomic recipe consumption and threshold checking functions.
- `src/services/meshSyncService.ts`: P2P mesh setup and table synchronization logic.
- `src/components/ResilienceHeader.tsx`: Enterprise status and resilience indicator bar.
- `src/components/TableSelector.tsx`: Table grid and mode switcher.
- `src/components/MenuCatalog.tsx`: Fast, memoized menu catalog grid.
- `src/components/ActiveCartDesk.tsx`: Reactive cart with line items, tax split calculations, and checkout triggers.
- `src/screens/POSMasterScreen.tsx`: Master landscape layout integrating all components seamlessly.