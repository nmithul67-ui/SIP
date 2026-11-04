/**
 * src/services/offlineSyncWorker.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Automated Network Re-connector & Offline Bill Flush Daemon.
 *
 * Monitors tablet network connectivity and automatically pushes unsynced offline
 * RxDB bill records to the central FastAPI endpoint `POST /api/v1/sync/bills`
 * whenever network connection is restored.
 */

import { getPOSDatabase } from '../database';
import { BillItemDocType } from '../database/schema';

export interface SyncStatusState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  syncInProgress: boolean;
}

type SyncStatusListener = (state: SyncStatusState) => void;

class OfflineSyncWorker {
  private isOnline: boolean = true;
  private pendingCount: number = 0;
  private lastSyncedAt: string | null = null;
  private syncInProgress: boolean = false;
  private listeners: SyncStatusListener[] = [];
  private checkInterval: any = null;
  private backendUrl: string = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

  constructor() {
    this.init();
  }

  public setBackendUrl(url: string) {
    this.backendUrl = url;
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.push(listener);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const state: SyncStatusState = {
      isOnline: this.isOnline,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      syncInProgress: this.syncInProgress,
    };
    this.listeners.forEach((l) => l(state));
  }

  public init() {
    if (this.checkInterval) return;

    // Run connection check every 10 seconds
    this.checkConnectionAndSync();
    this.checkInterval = setInterval(() => {
      this.checkConnectionAndSync();
    }, 10000);
  }

  public async checkConnectionAndSync(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.backendUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        this.isOnline = true;
        await this.flushPendingBills();
      } else {
        this.isOnline = false;
      }
    } catch {
      this.isOnline = false;
    }

    this.notify();
    return this.isOnline;
  }

  /**
   * Flushes unsynced bills from RxDB to the FastAPI central cloud engine
   */
  public async flushPendingBills(): Promise<number> {
    if (this.syncInProgress || !this.isOnline) return 0;

    this.syncInProgress = true;
    this.notify();

    let flushedCount = 0;

    try {
      const db = await getPOSDatabase();

      // Find bills marked draft or paid that haven't been synced
      const bills = await db.bills.find().exec();
      const billItems = await db.bill_items.find().exec();

      if (bills.length === 0) {
        this.pendingCount = 0;
        this.syncInProgress = false;
        this.notify();
        return 0;
      }

      this.pendingCount = bills.length;

      const payload = {
        business_id: 'biz_001',
        device_id: 'TAB-REST-MAIN',
        synced_at: new Date().toISOString(),
        bills: bills.map((b) => {
          const json = b.toJSON();
          return {
            bill_id: json.bill_id,
            table_id: json.table_id,
            status: json.status,
            timestamp: json.timestamp,
            subtotal: json.subtotal,
            cgst: json.cgst,
            sgst: json.sgst,
            grand_total: json.grand_total,
            payment_method: 'upi',
            waiter_name: json.waiter_name || 'Staff',
          };
        }),
        bill_items: billItems.map((bi) => {
          const json = bi.toJSON();
          return {
            bill_item_id: json.bill_item_id,
            item_id: json.item_id,
            name: json.name,
            quantity: json.quantity,
            price: json.price,
            tax_rate: json.tax_rate,
          };
        }),
      };

      const response = await fetch(`${this.backendUrl}/api/v1/sync/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        flushedCount = result.ingested || 0;
        this.lastSyncedAt = new Date().toLocaleTimeString('en-IN');
        this.pendingCount = 0;
        console.log(`[OfflineSyncWorker] Flushed ${flushedCount} bill records to cloud!`);
      }
    } catch (err) {
      console.warn('[OfflineSyncWorker] Sync attempt deferred:', err);
    } finally {
      this.syncInProgress = false;
      this.notify();
    }

    return flushedCount;
  }
}

export const syncWorker = new OfflineSyncWorker();
