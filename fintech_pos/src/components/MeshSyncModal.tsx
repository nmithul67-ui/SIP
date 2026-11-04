import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  X,
  Radio,
  Wifi,
  Bluetooth,
  Network,
  GitMerge,
  Smartphone,
  CheckCircle2,
  Plus,
  Send,
  Tablet,
  ChefHat,
  Monitor,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme/tokens';
import {
  getMeshState,
  subscribeToMesh,
  MeshSyncState,
  MeshPeer,
  registerNewDevice,
  sendOrderFromConnectedDevice,
} from '../services/meshSyncService';
import { MenuItemDocType } from '../database/schema';

interface MeshSyncModalProps {
  visible: boolean;
  onClose: () => void;
  activeTableId: string;
  onMeshItemReceived: (item: any) => void;
  menuItems?: MenuItemDocType[];
}

export const MeshSyncModal: React.FC<MeshSyncModalProps> = ({
  visible,
  onClose,
  activeTableId,
  onMeshItemReceived,
  menuItems = [],
}) => {
  const [meshState, setMeshState] = useState<MeshSyncState>(getMeshState());
  const [simMessage, setSimMessage] = useState<string | null>(null);

  // New device pairing state
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<'waiter_tab' | 'kitchen_display' | 'terminal'>('waiter_tab');

  // Send order from device state
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>(activeTableId || 't4');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);

  useEffect(() => {
    if (visible) {
      const unsubscribe = subscribeToMesh((state) => {
        setMeshState(state);
        if (state.discoveredPeers.length > 0 && !selectedDevice) {
          setSelectedDevice(state.discoveredPeers[0].name);
        }
      });
      return unsubscribe;
    }
  }, [visible]);

  const handlePairDevice = () => {
    if (!newDeviceName.trim()) {
      alert('Please enter a device name (e.g. Waiter Tab 3 - Rohit)');
      return;
    }
    const created = registerNewDevice(newDeviceName.trim(), newDeviceType, 'LAN');
    setSelectedDevice(created.name);
    setNewDeviceName('');
    setSimMessage(`✅ Real-time Device Added: "${created.name}" connected and synced!`);
    setTimeout(() => setSimMessage(null), 4000);
  };

  const handleSendOrderFromDevice = () => {
    const dish =
      menuItems[selectedItemIdx] || {
        item_id: 'menu_biryani_hyd',
        name: 'Hyderabadi Chicken Biryani',
        price: 340,
        tax_rate: 5,
      };

    const deviceName = selectedDevice || (meshState.discoveredPeers[0] ? meshState.discoveredPeers[0].name : 'Waiter Tab 02 (Anita)');

    const item = sendOrderFromConnectedDevice(deviceName, selectedTable, dish);
    onMeshItemReceived(item);

    setSimMessage(
      `📲 Order Dispatched from "${deviceName}"! Added 1x "${dish.name}" to Table ${selectedTable.toUpperCase()} on Main Device.`
    );

    setTimeout(() => {
      setSimMessage(null);
    }, 5000);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconBox}>
                <Radio size={20} color={COLORS.successDark} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Real-Time Connected Devices & P2P Order Sync</Text>
                <Text style={styles.headerSubtitle}>
                  Multi-tablet mesh • Instant order updates to Main Device with device name sync
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Network Summary Bar */}
          <View style={styles.statusBanner}>
            <View style={styles.statusPill}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.statusPillText}>
                SYNC ENGINE ACTIVE • {meshState.discoveredPeers.length} DEVICES CONNECTED
              </Text>
            </View>
            <Text style={styles.nodeIdText}>Main Terminal: {meshState.localPeerId}</Text>
          </View>

          {simMessage && (
            <View style={styles.messageBanner}>
              <CheckCircle2 size={16} color="#059669" style={{ marginRight: 8 }} />
              <Text style={styles.messageBannerText}>{simMessage}</Text>
            </View>
          )}

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Add / Pair Real-time Device */}
            <View style={styles.addDeviceCard}>
              <Text style={styles.cardHeaderTitle}>Pair / Add New Connected Device</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Add waiter tablet, KDS display, or bar station to sync orders live with this main POS
              </Text>

              <View style={styles.addDeviceRow}>
                <TextInput
                  style={styles.deviceInput}
                  placeholder="Device Name (e.g. Waiter Tab 3 - Rohit, Bar POS)"
                  placeholderTextColor="#94A3B8"
                  value={newDeviceName}
                  onChangeText={setNewDeviceName}
                />

                <View style={styles.typeSelectorRow}>
                  {(
                    [
                      { key: 'waiter_tab', label: 'Waiter Tab' },
                      { key: 'kitchen_display', label: 'Kitchen KDS' },
                      { key: 'terminal', label: 'Bar/Counter' },
                    ] as const
                  ).map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.typeBadge,
                        newDeviceType === t.key && styles.typeBadgeActive,
                      ]}
                      onPress={() => setNewDeviceType(t.key)}
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          newDeviceType === t.key && styles.typeBadgeTextActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.pairButton} onPress={handlePairDevice}>
                  <Plus size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.pairButtonText}>Connect Device</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Discovered & Connected Peer Devices */}
            <Text style={styles.sectionHeader}>
              Active Connected Devices ({meshState.discoveredPeers.length})
            </Text>

            <View style={styles.peerList}>
              {meshState.discoveredPeers.map((peer) => (
                <View key={peer.id} style={styles.peerCard}>
                  <View style={styles.peerIconWrapper}>
                    {peer.type === 'kitchen_display' ? (
                      <ChefHat size={18} color="#D97706" />
                    ) : peer.type === 'terminal' ? (
                      <Monitor size={18} color="#7C3AED" />
                    ) : (
                      <Tablet size={18} color="#059669" />
                    )}
                  </View>

                  <View style={styles.peerInfoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.peerName}>{peer.name}</Text>
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{peer.type.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.peerMeta}>
                      Transport: {peer.transport} • Latency: {peer.latencyMs}ms • Real-time Sync Active
                    </Text>
                  </View>

                  <View style={styles.statusIndicator}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>Live Sync</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 3. Send Order from Connected Device Simulator */}
            <View style={styles.dispatchCard}>
              <View style={styles.dispatchHeaderRow}>
                <Smartphone size={20} color={COLORS.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.dispatchTitle}>Test Order Dispatch From Connected Device</Text>
                  <Text style={styles.dispatchSubtitle}>
                    Select any paired device and dispatch an order — watch it update the Main Device cart live!
                  </Text>
                </View>
              </View>

              <View style={styles.dispatchControlsRow}>
                {/* Select Device */}
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.fieldLabel}>From Device:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    {meshState.discoveredPeers.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.deviceChip,
                          selectedDevice === p.name && styles.deviceChipActive,
                        ]}
                        onPress={() => setSelectedDevice(p.name)}
                      >
                        <Text
                          style={[
                            styles.deviceChipText,
                            selectedDevice === p.name && styles.deviceChipTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Select Table */}
                <View style={{ width: 140 }}>
                  <Text style={styles.fieldLabel}>To Table:</Text>
                  <View style={styles.tableChipsRow}>
                    {['t1', 't2', 't4', 't6'].map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.tableChip,
                          selectedTable === t && styles.tableChipActive,
                        ]}
                        onPress={() => setSelectedTable(t)}
                      >
                        <Text
                          style={[
                            styles.tableChipText,
                            selectedTable === t && styles.tableChipTextActive,
                          ]}
                        >
                          {t.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.dispatchButton}
                onPress={handleSendOrderFromDevice}
                activeOpacity={0.8}
              >
                <Send size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.dispatchButtonText}>
                  Send Order to Main Device ({selectedTable.toUpperCase()})
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 920,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  nodeIdText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  messageBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  bodyScroll: {
    padding: 24,
  },
  addDeviceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  addDeviceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  deviceInput: {
    flex: 2,
    minWidth: 200,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  typeBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  typeBadgeTextActive: {
    color: '#FFFFFF',
  },
  pairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
  },
  pairButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  peerList: {
    gap: 10,
    marginBottom: 20,
  },
  peerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  peerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  peerInfoCol: {
    flex: 1,
  },
  peerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  peerMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  activeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  dispatchCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  dispatchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dispatchTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  dispatchSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  dispatchControlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
    textTransform: 'uppercase',
  },
  deviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
    marginRight: 6,
  },
  deviceChipActive: {
    backgroundColor: COLORS.primary,
  },
  deviceChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  deviceChipTextActive: {
    color: '#FFFFFF',
  },
  tableChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  tableChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
  },
  tableChipActive: {
    backgroundColor: COLORS.primary,
  },
  tableChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  tableChipTextActive: {
    color: '#FFFFFF',
  },
  dispatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  dispatchButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
