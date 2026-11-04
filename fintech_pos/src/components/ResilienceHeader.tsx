import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Radio,
  Clock,
  User,
  Store,
  Layers,
  Sparkles,
  AlertTriangle,
  FileText,
  Settings,
} from 'lucide-react-native';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, LAYOUT } from '../theme/tokens';
import { subscribeToMesh, MeshSyncState } from '../services/meshSyncService';
import { subscribeToInventoryChanges, getLowStockIngredients, LowStockAlert } from '../services/inventoryEngine';
import { syncWorker, SyncStatusState } from '../services/offlineSyncWorker';

interface ResilienceHeaderProps {
  onOpenInventory: () => void;
  onOpenMeshSync: () => void;
  onOpenCAPortal?: () => void;
  onOpenSetup?: () => void;
  onOpenRecords?: () => void;
  businessName?: string;
  businessGstin?: string;
}

export const ResilienceHeader: React.FC<ResilienceHeaderProps> = ({
  onOpenInventory,
  onOpenMeshSync,
  onOpenCAPortal,
  onOpenSetup,
  onOpenRecords,
  businessName,
  businessGstin,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [meshState, setMeshState] = useState<MeshSyncState | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [syncState, setSyncState] = useState<SyncStatusState | null>(null);

  // Live real-time clock updating every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to P2P mesh sync updates
  useEffect(() => {
    const unsubscribe = subscribeToMesh((state) => {
      setMeshState(state);
    });
    return unsubscribe;
  }, []);

  // Monitor low-stock triggers
  useEffect(() => {
    const checkStock = async () => {
      const alerts = await getLowStockIngredients();
      setLowStockCount(alerts.length);
    };
    checkStock();
    const unsubscribe = subscribeToInventoryChanges(checkStock);
    return unsubscribe;
  }, []);

  // Monitor cloud sync worker state
  useEffect(() => {
    const unsubscribe = syncWorker.subscribe((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  return (
    <View style={styles.headerContainer}>
      {/* LEFT: Brand Identity & Terminal ID */}
      <View style={styles.leftSection}>
        <View style={styles.brandIconWrapper}>
          <Store size={20} color={COLORS.primary} />
        </View>
        <View style={styles.brandMeta}>
          <Text style={styles.outletName} numberOfLines={1}>
            {businessName || 'Aura Gourmet Bistro & Bakery'}
          </Text>
          <View style={styles.terminalRow}>
            <Text style={styles.terminalBadge}>TERM-01 (MAIN)</Text>
            <Text style={styles.gstinText}>GSTIN: {businessGstin || '29ABCDE1234F1Z5'}</Text>
          </View>
        </View>
      </View>

      {/* CENTER: Local-First Resilience Status Pill */}
      <View style={styles.centerSection}>
        <View style={styles.resiliencePill}>
          <View style={[styles.statusDot, syncState && !syncState.isOnline && { backgroundColor: COLORS.warning }]} />
          <ShieldCheck size={16} color={COLORS.successDark} style={{ marginRight: 6 }} />
          <Text style={styles.resiliencePillText}>
            {syncState?.syncInProgress
              ? 'SYNCING BILLS TO CLOUD…'
              : syncState?.isOnline
              ? 'OFFLINE ENGINE ACTIVE | 0 ms Latency (Cloud Synced)'
              : 'OFFLINE MODE (RxDB Local Storage Active)'}
          </Text>
        </View>
      </View>

      {/* RIGHT: Mesh Sync Badge, Staff Badge, Inventory Drawer & Live Clock */}
      <View style={styles.rightSection}>
        {/* Merchant Admin Setup Button */}
        {onOpenSetup && (
          <TouchableOpacity
            style={styles.actionBadge}
            onPress={onOpenSetup}
            activeOpacity={0.7}
          >
            <Settings size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.actionBadgeText}>Admin Setup</Text>
          </TouchableOpacity>
        )}

        {/* Paid Records Button */}
        {onOpenRecords && (
          <TouchableOpacity
            style={[styles.actionBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
            onPress={onOpenRecords}
            activeOpacity={0.7}
          >
            <FileText size={14} color="#059669" style={{ marginRight: 4 }} />
            <Text style={[styles.actionBadgeText, { color: '#059669', fontWeight: '800' }]}>
              Records
            </Text>
          </TouchableOpacity>
        )}

        {/* Low Stock Alert Button */}
        <TouchableOpacity
          style={[styles.actionBadge, lowStockCount > 0 && styles.lowStockActionBadge]}
          onPress={onOpenInventory}
          activeOpacity={0.7}
        >
          {lowStockCount > 0 ? (
            <AlertTriangle size={15} color={COLORS.warningText} style={{ marginRight: 5 }} />
          ) : (
            <Layers size={15} color={COLORS.primary} style={{ marginRight: 5 }} />
          )}
          <Text style={[styles.actionBadgeText, lowStockCount > 0 && styles.lowStockActionText]}>
            Stock {lowStockCount > 0 ? `(${lowStockCount} Low)` : 'Live'}
          </Text>
        </TouchableOpacity>

        {/* P2P Mesh Sync Badge */}
        <TouchableOpacity
          style={styles.meshBadge}
          onPress={onOpenMeshSync}
          activeOpacity={0.7}
        >
          <Radio size={14} color={COLORS.successDark} style={{ marginRight: 5 }} />
          <Text style={styles.meshBadgeText}>
            P2P Mesh: {meshState ? `${meshState.connectedPeersCount} Peers` : '3 Peers'}
          </Text>
        </TouchableOpacity>

        {/* CA Portal & GST Audit Button */}
        <TouchableOpacity
          style={styles.actionBadge}
          onPress={() => {
            if (onOpenCAPortal) {
              onOpenCAPortal();
            } else if (typeof window !== 'undefined') {
              window.open('http://localhost:8000/ca-portal', '_blank');
            } else {
              Linking.openURL('http://localhost:8000/ca-portal');
            }
          }}
          activeOpacity={0.7}
        >
          <FileText size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={styles.actionBadgeText}>CA Portal</Text>
        </TouchableOpacity>

        {/* Staff Identifier */}
        <View style={styles.staffBadge}>
          <User size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.staffText}>Capt. Vikram S.</Text>
        </View>

        {/* Live Clock with Monospace / tabular numerals */}
        <View style={styles.clockWrapper}>
          <Clock size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.clockText}>{currentTime || '10:50:00 AM'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: LAYOUT.headerHeight,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    zIndex: 10,
    ...SHADOWS.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 260,
  },
  brandIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  brandMeta: {
    justifyContent: 'center',
  },
  outletName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  terminalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  terminalBadge: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  gstinText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  resiliencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  resiliencePillText: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.successText,
    letterSpacing: 0.2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  lowStockActionBadge: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warning,
  },
  actionBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
  },
  lowStockActionText: {
    color: COLORS.warningText,
  },
  meshBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  meshBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.successText,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  staffText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
  },
  clockWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 96,
    justifyContent: 'center',
  },
  clockText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
});
