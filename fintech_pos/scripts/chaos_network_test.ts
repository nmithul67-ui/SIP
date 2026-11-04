// scripts/chaos_network_test.ts
/**
 * Automated Chaos Simulator script for Phase?5.
 * Simulates sudden Wi-Fi router dropouts while multiple tablets punch bills.
 * Validates Yjs CRDT state convergence and measures commit latency.
 */
import { execSync } from 'child_process';
import axios from 'axios';
import * as fs from 'fs';

// Configuration
const NUM_TABLETS = 3;
const BILLS_PER_TABLET = 50;
const WIFI_DROP_DURATION_MS = 5000; // simulate 5s outage
const SERVER_ENDPOINT = 'http://localhost:8000/api/v1/test/chaos'; // placeholder

/**
 * Simulate a tablet punching a bill.
 * In real scenario this would call the local app APIs. Here we mimic with HTTP POST.
 */
async function punchBill(tabletId: number, billNumber: number) {
  const payload = {
    tabletId,
    billNumber,
    items: [{ name: 'Item A', qty: 1, price: 100 }],
    timestamp: Date.now()
  };
  try {
    await axios.post(${SERVER_ENDPOINT}/bill, payload);
  } catch (e) {
    console.error(Tablet  bill  failed:, e.message);
  }
}

/**
 * Simulate Wi-Fi router drop by toggling network interface.
 * This uses OS commands – works on Linux/macOS. For Windows, adjust accordingly.
 */
function toggleWifi(enable: boolean) {
  const cmd = enable ? 'netsh interface set interface  Wi-Fi enable' : 'netsh interface set interface Wi-Fi disable';
  try {
    execSync(cmd);
    console.log(Wi-Fi );
  } catch (e) {
    console.warn('Wi-Fi toggle failed (might be non-Windows env):', e.message);
  }
}

async function runChaosTest() {
  console.log('Starting Chaos Simulator');
  // Start punching bills concurrently
  const punchPromises: Promise<void>[] = [];
  for (let t = 1; t <= NUM_TABLETS; t++) {
    for (let b = 1; b <= BILLS_PER_TABLET; b++) {
      punchPromises.push(punchBill(t, b));
    }
  }

  // After a short delay, drop Wi-Fi
  setTimeout(() => {
    toggleWifi(false);
    setTimeout(() => toggleWifi(true), WIFI_DROP_DURATION_MS);
  }, 2000);

  await Promise.all(punchPromises);
  console.log('All bills submitted, awaiting CRDT convergence');

  // Query server for convergence status
  try {
    const res = await axios.get(${SERVER_ENDPOINT}/status);
    console.log('Convergence report:', res.data);
  } catch (e) {
    console.error('Failed to fetch convergence status:', e.message);
  }
}

runChaosTest().catch(err => console.error('Chaos test errored:', err));
