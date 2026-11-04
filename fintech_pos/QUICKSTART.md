# Quickstart Guide: Resilient Enterprise POS

Industrial, India-first Financial Operating System (POS) built for food-and-beverage MSMEs (standalone restaurants and bakeries) operating on 10.1-inch Android tablets in landscape orientation (1280x800 / 1920x1200).

---

## 1. Quick Launch (3 Ways)

### Option A: Instant Production Server (Fastest — 1 Second)
The optimized production bundle is already compiled in `./dist`. To launch it immediately:

```bash
npx serve dist -l 3000
```
- Open in browser: `http://localhost:3000`
- **To access from a Tablet**: Connect tablet to the same Wi-Fi, find your PC's IP (e.g. `192.168.1.15`), and open `http://192.168.1.15:3000` in Chrome on the tablet. Tap `(⋮)` -> **Add to Home screen** for full-screen landscape POS.

---

### Option B: Expo Web Dev Server (Live Reload & Code Changes)
If you are developing or modifying components:

```bash
npm run web
# OR
npx expo start --web
```
- Launches the Metro bundler with hot module reloading.

---

### Option C: Native Android Tablet via Expo Go
To test natively on an Android tablet without building an APK:

```bash
npx expo start
```
1. Install **Expo Go** from Google Play Store on your Android tablet.
2. Ensure tablet and PC are on the same Wi-Fi.
3. Scan the QR code displayed in the terminal with the Expo Go app.

---

### Option D: Build Standalone Android APK (Production Tablet Deploy)
To generate an installable `.apk` file:

```bash
npm install -g eas-cli
npx eas-cli build -p android --profile preview
```
Download the resulting `.apk` and install it onto any budget Android tablet. It will automatically lock into fixed landscape orientation.

---

## 2. Key Features & How to Test Them

| Feature | How to Test | Expected Behavior |
| :--- | :--- | :--- |
| **Instant Ordering (<5ms)** | Tap any item card in the Center Pane | Adds item to active order immediately. Counter badge (`× 1`, `× 2`) updates on the card. |
| **Quantity Steppers** | In Right Pane, tap `[-]` or `[+]` | Adjusts quantity or removes line item. Line total updates. |
| **Indian GST Split** | Inspect Right Pane summary | Automatic 50/50 split of GST: 5% items split into **CGST 2.5%** and **SGST 2.5%**; 18% items split into **9% + 9%**. |
| **Thermal KOT** | Tap `[ Send KOT ]` button | Opens thermal kitchen slip preview with server, table, and items. Confirming marks bill as `KOT_SENT`. |
| **Live Inventory Engine** | Tap `[ Stock Live ]` in top bar | View live ingredient levels (Rice, Ghee, Chicken, etc.), threshold warnings (`< min_threshold`), restock triggers, and auto-deduction logs. |
| **P2P Mesh Sync (Ditto + Yjs)** | Tap `[ P2P Mesh ]` in top bar | View discovered sibling terminals (BLE/LAN). Tap `[ Simulate Concurrent Waiter Edit ]` to test Yjs CRDT conflict-free order merging. |
| **Quick Pay & Settlement** | Tap `[ Quick Pay ]` button | Choose Cash (with change calculator), UPI QR, or Card. Tap `[ Complete Payment & Settle Table ]`. Bill marks `PAID`, recipes are deducted from stock atomically, and the table resets to `VACANT`. |

---

## 3. Keyboard & Touch Shortcuts

- **F1**: Focus menu catalog search bar
- **F3**: Quick-cycle categories
- **Min 48x48dp touch targets**: Optimized for rapid thumb punching on tablet touchscreens

---

## 4. Project Structure Reference

```
e:/sip_!!1/
├── App.tsx                      # Root landscape container
├── QUICKSTART.md                # This guide
├── app.json                     # Expo landscape configuration
├── metro.config.js              # Metro bundler with modern package exports enabled
├── package.json                 # Dependencies (RxDB, Yjs, Lucide, Expo)
├── dist/                        # Pre-compiled web production bundle
└── src/
    ├── theme/
    │   └── tokens.ts            # Design tokens (Canvas #F4F6F9, Brand #1F497D, etc.)
    ├── database/
    │   ├── schema.ts            # Typed RxDB schemas (7 entities)
    │   ├── seed.ts              # Authentic MSME seed data (12 tables, menu, recipes)
    │   └── index.ts             # RxDB database singleton
    ├── services/
    │   ├── inventoryEngine.ts   # Atomic recipe-to-stock deduction & thresholds
    │   └── meshSyncService.ts   # Ditto Edge BLE/LAN sync & Yjs CRDT merge logic
    ├── components/
    │   ├── ResilienceHeader.tsx # 56px Top resilience bar with 0ms latency pill
    │   ├── TableSelector.tsx    # 26% Left pane (12 table cards & categories)
    │   ├── MenuCatalog.tsx      # 42% Center pane (fast search & item cards)
    │   ├── ActiveCartDesk.tsx   # 32% Right pane (cart, tax split, checkout)
    │   ├── InventoryModal.tsx   # Live stock levels & consumption audit trail
    │   ├── KOTModal.tsx         # Thermal kitchen slip simulation
    │   ├── CheckoutModal.tsx    # Cash/UPI settlement & atomic deduction
    │   └── MeshSyncModal.tsx    # P2P mesh & CRDT merge simulator
    └── screens/
        └── POSMasterScreen.tsx  # Master 4-region landscape screen
```
