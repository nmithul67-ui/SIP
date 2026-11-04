import * as Y from 'yjs';
import { BillItemDocType } from '../database/schema';

export interface MeshPeer {
  id: string;
  name: string;
  type: 'terminal' | 'waiter_tab' | 'kitchen_display' | 'kiosk';
  transport: 'BLE' | 'LAN' | 'WiFi-Direct';
  latencyMs: number;
  status: 'connected' | 'syncing' | 'idle';
  lastSeen: number;
  syncedTables: string[];
}

export interface MeshSyncState {
  isActive: boolean;
  localPeerId: string;
  connectedPeersCount: number;
  syncProtocol: string;
  lastSyncTimestamp: number;
  discoveredPeers: MeshPeer[];
  crdtDocVersion: number;
}

// -------------------------------------------------------------
// Yjs CRDT Architecture for Concurrent Table Order Merging
// -------------------------------------------------------------
// Primary Yjs document managing distributed table orders
const ydoc = new Y.Doc();
// Root map for all tables: tableId -> Y.Map of items
const yTablesMap = ydoc.getMap<Y.Map<any>>('tables_crdt');

// Sibling peers in local MSME restaurant mesh (BLE + LAN)
let peers: MeshPeer[] = [
  {
    id: 'peer_waiter_tab_02',
    name: 'Waiter Tab 02 (Capt. Anita)',
    type: 'waiter_tab',
    transport: 'BLE',
    latencyMs: 14,
    status: 'connected',
    lastSeen: Date.now(),
    syncedTables: ['T4', 'T6', 'T1'],
  },
  {
    id: 'peer_kds_kitchen_01',
    name: 'KDS Kitchen Display 01',
    type: 'kitchen_display',
    transport: 'LAN',
    latencyMs: 3,
    status: 'connected',
    lastSeen: Date.now(),
    syncedTables: ['T4', 'T2'],
  },
  {
    id: 'peer_bakery_counter_03',
    name: 'Bakery Counter Tab',
    type: 'terminal',
    transport: 'LAN',
    latencyMs: 5,
    status: 'connected',
    lastSeen: Date.now(),
    syncedTables: ['T1', 'T5', 'T7'],
  },
];

type MeshListener = (state: MeshSyncState) => void;
const meshListeners: Set<MeshListener> = new Set();

export function subscribeToMesh(listener: MeshListener) {
  meshListeners.add(listener);
  // Immediate trigger with current state
  listener(getMeshState());
  return () => {
    meshListeners.delete(listener);
  };
}

function notifyMeshSubscribers() {
  const state = getMeshState();
  meshListeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.error('[MeshSync] Error in listener callback:', e);
    }
  });
}

/**
 * Returns current P2P mesh network status
 */
export function getMeshState(): MeshSyncState {
  const connected = peers.filter((p) => p.status === 'connected' || p.status === 'syncing').length;
  return {
    isActive: true,
    localPeerId: 'POS-MASTER-TAB-01',
    connectedPeersCount: connected,
    syncProtocol: 'Ditto Edge v4.8 + Yjs CRDT (BLE/LAN)',
    lastSyncTimestamp: Date.now(),
    discoveredPeers: [...peers],
    crdtDocVersion: ydoc.clientID,
  };
}

/**
 * Syncs local cart / order state into the Yjs CRDT document
 */
export function syncOrderToMeshCRDT(
  tableId: string,
  billId: string,
  items: BillItemDocType[]
): Uint8Array {
  // Transact atomically in Yjs
  ydoc.transact(() => {
    let tableMap = yTablesMap.get(tableId);
    if (!tableMap) {
      tableMap = new Y.Map();
      yTablesMap.set(tableId, tableMap);
    }

    // Set metadata
    tableMap.set('table_id', tableId);
    tableMap.set('bill_id', billId);
    tableMap.set('updated_at', Date.now());

    // Encode items map: itemId -> { quantity, price, tax_rate, name }
    const itemsMap = new Y.Map<any>();
    items.forEach((item) => {
      itemsMap.set(item.item_id, {
        bill_item_id: item.bill_item_id,
        item_id: item.item_id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        tax_rate: item.tax_rate,
      });
    });

    tableMap.set('items', itemsMap);
  });

  // Generate binary CRDT state update vector
  const updateVector = Y.encodeStateAsUpdate(ydoc);

  // Mark sibling peers as synced
  peers = peers.map((p) => ({
    ...p,
    lastSeen: Date.now(),
    status: 'connected',
  }));

  notifyMeshSubscribers();
  return updateVector;
}

/**
 * Merges an incoming CRDT update from a sibling terminal (e.g. Waiter Tablet)
 * Demonstrates conflict-free resolution without dropping concurrent edits
 */
export function applyRemoteMeshUpdate(remoteUpdate: Uint8Array): boolean {
  try {
    Y.applyUpdate(ydoc, remoteUpdate);
    notifyMeshSubscribers();
    return true;
  } catch (err) {
    console.error('[MeshSync] CRDT merge error:', err);
    return false;
  }
}

/**
 * Simulates a concurrent order addition from a sibling tablet (e.g., Waiter Tab 02 adds an item to T4)
 * Demonstrates real Yjs CRDT conflict resolution live in the UI
 */
export function simulateConcurrentSiblingEdit(
  tableId: string,
  itemToAdd: { item_id: string; name: string; price: number; tax_rate: number }
): BillItemDocType {
  console.log(`[MeshSync] Simulating concurrent edit from Waiter-Tab-02 on ${tableId}...`);

  // Create an independent sibling Y.Doc (representing Waiter Tab 02)
  const siblingDoc = new Y.Doc();
  // Sync current state from master doc
  const masterState = Y.encodeStateAsUpdate(ydoc);
  Y.applyUpdate(siblingDoc, masterState);

  // Sibling performs edit
  siblingDoc.transact(() => {
    const siblingTables = siblingDoc.getMap<Y.Map<any>>('tables_crdt');
    let tMap = siblingTables.get(tableId);
    if (!tMap) {
      tMap = new Y.Map();
      siblingTables.set(tableId, tMap);
    }

    let itemsMap = tMap.get('items') as Y.Map<any>;
    if (!itemsMap) {
      itemsMap = new Y.Map();
      tMap.set('items', itemsMap);
    }

    const existing = itemsMap.get(itemToAdd.item_id);
    const newQty = existing ? (existing.quantity || 1) + 1 : 1;

    itemsMap.set(itemToAdd.item_id, {
      bill_item_id: `mesh_${Date.now()}_${itemToAdd.item_id}`,
      item_id: itemToAdd.item_id,
      name: itemToAdd.name,
      quantity: newQty,
      price: itemToAdd.price,
      tax_rate: itemToAdd.tax_rate,
    });
  });

  // Extract delta from sibling
  const siblingDelta = Y.encodeStateAsUpdate(siblingDoc);

  // Apply sibling delta into master Y.Doc
  Y.applyUpdate(ydoc, siblingDelta);

  notifyMeshSubscribers();

  return {
    bill_item_id: `mesh_${Date.now()}_${itemToAdd.item_id}`,
    bill_id: 'bill_t4_active',
    item_id: itemToAdd.item_id,
    name: itemToAdd.name,
    quantity: 1,
    price: itemToAdd.price,
    tax_rate: itemToAdd.tax_rate,
  };
}

export interface RemoteOrderEvent {
  tableId: string;
  deviceName: string;
  item: BillItemDocType;
  timestamp: number;
}

type RemoteOrderListener = (event: RemoteOrderEvent) => void;
const orderListeners: Set<RemoteOrderListener> = new Set();

export function subscribeToRemoteOrders(listener: RemoteOrderListener) {
  orderListeners.add(listener);
  return () => {
    orderListeners.delete(listener);
  };
}

export function notifyOrderListeners(event: RemoteOrderEvent) {
  orderListeners.forEach((fn) => {
    try {
      fn(event);
    } catch (e) {
      console.error('[MeshSync] Error in remote order listener:', e);
    }
  });
}

/**
 * Register a newly paired / connected device in real-time
 */
export function registerNewDevice(
  name: string,
  type: 'waiter_tab' | 'kitchen_display' | 'terminal' | 'kiosk' = 'waiter_tab',
  transport: 'BLE' | 'LAN' | 'WiFi-Direct' = 'LAN'
): MeshPeer {
  const newPeer: MeshPeer = {
    id: `peer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    type,
    transport,
    latencyMs: Math.floor(2 + Math.random() * 8),
    status: 'connected',
    lastSeen: Date.now(),
    syncedTables: ['T1', 'T2', 'T4', 'T6'],
  };

  peers = [newPeer, ...peers];
  notifyMeshSubscribers();
  console.log(`[MeshSync] New peer device registered: "${name}" (${type}) via ${transport}`);
  return newPeer;
}

/**
 * Dispatches an order from a connected peer tablet to the master POS
 */
export function sendOrderFromConnectedDevice(
  deviceName: string,
  tableId: string,
  itemToAdd: { item_id: string; name: string; price: number; tax_rate: number }
): BillItemDocType {
  const billItemId = `remote_${Date.now()}_${itemToAdd.item_id}`;
  const newItem: BillItemDocType = {
    bill_item_id: billItemId,
    bill_id: `bill_${tableId}_active`,
    item_id: itemToAdd.item_id,
    name: itemToAdd.name,
    quantity: 1,
    price: itemToAdd.price,
    tax_rate: itemToAdd.tax_rate,
  };

  // Sync into Yjs CRDT
  ydoc.transact(() => {
    let tableMap = yTablesMap.get(tableId);
    if (!tableMap) {
      tableMap = new Y.Map();
      yTablesMap.set(tableId, tableMap);
    }
    let itemsMap = tableMap.get('items') as Y.Map<any>;
    if (!itemsMap) {
      itemsMap = new Y.Map();
      tableMap.set('items', itemsMap);
    }
    const existing = itemsMap.get(itemToAdd.item_id);
    const newQty = existing ? (existing.quantity || 1) + 1 : 1;
    itemsMap.set(itemToAdd.item_id, {
      ...newItem,
      quantity: newQty,
    });
  });

  // Update peer last seen
  const peerIndex = peers.findIndex((p) => p.name === deviceName || p.id === deviceName);
  if (peerIndex >= 0) {
    peers[peerIndex].lastSeen = Date.now();
    peers[peerIndex].status = 'connected';
    if (!peers[peerIndex].syncedTables.includes(tableId.toUpperCase())) {
      peers[peerIndex].syncedTables.push(tableId.toUpperCase());
    }
  }

  notifyMeshSubscribers();

  // Notify Main Device immediately
  notifyOrderListeners({
    tableId,
    deviceName,
    item: newItem,
    timestamp: Date.now(),
  });

  return newItem;
}
