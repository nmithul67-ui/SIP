import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import {
  X,
  Store,
  Plus,
  Trash2,
  CheckCircle,
  Settings,
  CreditCard,
  QrCode,
  Smartphone,
  UtensilsCrossed,
  RefreshCw,
  Layers,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, formatINR } from '../theme/tokens';
import { TableDocType, MenuItemDocType, BusinessDocType } from '../database/schema';

interface MerchantSetupModalProps {
  visible: boolean;
  onClose: () => void;
  business: BusinessDocType;
  onUpdateBusiness: (updated: BusinessDocType) => void;
  onAddTable: (newTable: TableDocType) => void;
  onAddMenuItem: (newItem: MenuItemDocType) => void;
  onClearSeedData: () => void;
}

export const MerchantSetupModal: React.FC<MerchantSetupModalProps> = ({
  visible,
  onClose,
  business,
  onUpdateBusiness,
  onAddTable,
  onAddMenuItem,
  onClearSeedData,
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'tables' | 'menu' | 'payments'>('store');

  // Business Form State
  const [storeName, setStoreName] = useState<string>(business?.name || 'Aura Gourmet Bistro & Bakery');
  const [gstin, setGstin] = useState<string>(business?.gstin || '29ABCDE1234F1Z5');
  const [merchantVpa, setMerchantVpa] = useState<string>('spicegarden@icici');

  // New Table Form State
  const [newTableLabel, setNewTableLabel] = useState<string>('');
  const [newTableCapacity, setNewTableCapacity] = useState<string>('4');
  const [newTableWaiter, setNewTableWaiter] = useState<string>('Vikram S.');

  // New Menu Item Form State
  const [itemName, setItemName] = useState<string>('');
  const [itemCategory, setItemCategory] = useState<string>('Biryani');
  const [itemPrice, setItemPrice] = useState<string>('');
  const [itemTaxRate, setItemTaxRate] = useState<number>(5);
  const [itemDescription, setItemDescription] = useState<string>('');

  // Payment Channels Toggle State
  const [payCash, setPayCash] = useState<boolean>(true);
  const [payUpi, setPayUpi] = useState<boolean>(true);
  const [payCard, setPayCard] = useState<boolean>(true);
  const [payCreditLine, setPayCreditLine] = useState<boolean>(true);
  const [payWhatsApp, setPayWhatsApp] = useState<boolean>(true);

  // Save Business Meta
  const handleSaveStoreMeta = () => {
    onUpdateBusiness({
      ...business,
      name: storeName,
      gstin: gstin,
    });
    Alert.alert('Store Updated', 'Restaurant name and GSTIN updated successfully.');
  };

  // Add Table
  const handleCreateTable = () => {
    if (!newTableLabel.trim()) {
      Alert.alert('Validation Error', 'Table label is required (e.g., T13, VIP-1)');
      return;
    }
    const tId = `t_${Date.now()}`;
    const newTable: TableDocType = {
      table_id: tId,
      label: newTableLabel.trim().toUpperCase(),
      status: 'vacant',
      active_bill_id: null,
      assigned_waiter: newTableWaiter.trim() || 'Staff',
      seated_time: null,
      guest_count: parseInt(newTableCapacity) || 4,
    };
    onAddTable(newTable);
    setNewTableLabel('');
    Alert.alert('Table Created', `Table ${newTable.label} added to floor map!`);
  };

  // Add Menu Item
  const handleCreateMenuItem = () => {
    if (!itemName.trim() || !itemPrice.trim()) {
      Alert.alert('Validation Error', 'Item name and price are required.');
      return;
    }
    const mId = `menu_${Date.now()}`;
    const newItem: MenuItemDocType = {
      item_id: mId,
      name: itemName.trim(),
      category: itemCategory,
      price: parseFloat(itemPrice) || 100,
      tax_rate: itemTaxRate,
      is_available: true,
      short_code: itemName.trim().substring(0, 5).toUpperCase(),
      description: itemDescription.trim() || 'Freshly prepared item',
    };
    onAddMenuItem(newItem);
    setItemName('');
    setItemPrice('');
    setItemDescription('');
    Alert.alert('Menu Item Created', `"${newItem.name}" added to ${itemCategory} category!`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBg}>
                <Settings size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Merchant Setup & POS Admin</Text>
                <Text style={styles.headerSubtitle}>
                  Add Restaurant • Manage Tables • Custom Menu Catalog • Payment Rails
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'store' && styles.tabItemActive]}
              onPress={() => setActiveTab('store')}
            >
              <Store size={16} color={activeTab === 'store' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.tabText, activeTab === 'store' && styles.tabTextActive]}>
                Store & GSTIN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'tables' && styles.tabItemActive]}
              onPress={() => setActiveTab('tables')}
            >
              <Layers size={16} color={activeTab === 'tables' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.tabText, activeTab === 'tables' && styles.tabTextActive]}>
                + Add Tables
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'menu' && styles.tabItemActive]}
              onPress={() => setActiveTab('menu')}
            >
              <UtensilsCrossed size={16} color={activeTab === 'menu' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.tabText, activeTab === 'menu' && styles.tabTextActive]}>
                + Add Menu Item
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'payments' && styles.tabItemActive]}
              onPress={() => setActiveTab('payments')}
            >
              <CreditCard size={16} color={activeTab === 'payments' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
                Payment Config
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* TAB 1: Store & GSTIN Meta */}
            {activeTab === 'store' && (
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Restaurant Identity & Tax Profile</Text>
                
                <Text style={styles.label}>Restaurant / Outlet Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder="e.g. Spice Garden Restaurant"
                />

                <Text style={styles.label}>Merchant GSTIN (15-Character Tax ID)</Text>
                <TextInput
                  style={styles.textInput}
                  value={gstin}
                  onChangeText={setGstin}
                  placeholder="27AAACS1234F1Z5"
                  autoCapitalize="characters"
                />

                <Text style={styles.label}>Merchant UPI VPA (for QR Code Collection)</Text>
                <TextInput
                  style={styles.textInput}
                  value={merchantVpa}
                  onChangeText={setMerchantVpa}
                  placeholder="spicegarden@icici"
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveStoreMeta}>
                  <CheckCircle size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Save Store Details</Text>
                </TouchableOpacity>

                <View style={styles.resetDivider} />

                <Text style={styles.sectionTitle}>Clear Demo Seed Data</Text>
                <Text style={styles.resetDesc}>
                  Wipe pre-loaded restaurant seed data to start with a fresh clean setup.
                </Text>
                <TouchableOpacity style={styles.dangerBtn} onPress={onClearSeedData}>
                  <Trash2 size={16} color={COLORS.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.dangerBtnText}>Reset Orders & Clear Seed Data</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 2: Add Tables */}
            {activeTab === 'tables' && (
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Create Custom Dining Table</Text>

                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Table Label (e.g. T13, Outdoor-1, VIP-2)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newTableLabel}
                      onChangeText={setNewTableLabel}
                      placeholder="T13"
                    />
                  </View>
                  <View style={{ width: 120 }}>
                    <Text style={styles.label}>Seating Capacity</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newTableCapacity}
                      onChangeText={setNewTableCapacity}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Assigned Waiter / Captain Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newTableWaiter}
                  onChangeText={setNewTableWaiter}
                  placeholder="Rajesh K."
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleCreateTable}>
                  <Plus size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Add Table to Floor Map</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: Add Menu Item */}
            {activeTab === 'menu' && (
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Add Custom Dish or Beverage to Catalog</Text>

                <Text style={styles.label}>Item Title / Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={itemName}
                  onChangeText={setItemName}
                  placeholder="Paneer Butter Masala"
                />

                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryPillRow}>
                      {['Biryani', 'South Indian', 'Bakery', 'Beverages', 'Starters'].map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.catPill,
                            itemCategory === cat && styles.catPillActive,
                          ]}
                          onPress={() => setItemCategory(cat)}
                        >
                          <Text
                            style={[
                              styles.catPillText,
                              itemCategory === cat && styles.catPillTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Selling Price (₹)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={itemPrice}
                      onChangeText={setItemPrice}
                      placeholder="320"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ width: 150 }}>
                    <Text style={styles.label}>GST Rate %</Text>
                    <View style={styles.gstPillRow}>
                      {[5, 12, 18].map((rate) => (
                        <TouchableOpacity
                          key={rate}
                          style={[
                            styles.gstPill,
                            itemTaxRate === rate && styles.gstPillActive,
                          ]}
                          onPress={() => setItemTaxRate(rate)}
                        >
                          <Text
                            style={[
                              styles.gstPillText,
                              itemTaxRate === rate && styles.gstPillTextActive,
                            ]}
                          >
                            {rate}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <Text style={styles.label}>Description / Ingredients</Text>
                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  value={itemDescription}
                  onChangeText={setItemDescription}
                  placeholder="Cottage cheese cubes simmered in butter tomato gravy"
                  multiline
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleCreateMenuItem}>
                  <Plus size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Add Item to Menu Catalog</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 4: Payment Config */}
            {activeTab === 'payments' && (
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Active Payment Channels</Text>
                
                {[
                  { title: 'Cash Counter Settlement', desc: 'Accept cash with automatic change due calculator', state: payCash, setter: setPayCash },
                  { title: 'Dynamic Bharat UPI QR', desc: 'Single-use QR code linked to merchant VPA', state: payUpi, setter: setPayUpi },
                  { title: 'Card POS Terminal', desc: 'USB-Serial connected PINpad card reader', state: payCard, setter: setPayCard },
                  { title: 'Credit Line on UPI', desc: 'Decentro pre-sanctioned bank credit line', state: payCreditLine, setter: setPayCreditLine },
                  { title: 'WhatsApp E-Invoicing', desc: 'Twilio WhatsApp paperless digital receipts', state: payWhatsApp, setter: setPayWhatsApp },
                ].map((channel, i) => (
                  <View key={i} style={styles.channelRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.channelTitle}>{channel.title}</Text>
                      <Text style={styles.channelDesc}>{channel.desc}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleBadge,
                        channel.state ? styles.toggleOn : styles.toggleOff,
                      ]}
                      onPress={() => channel.setter(!channel.state)}
                    >
                      <Text style={styles.toggleText}>
                        {channel.state ? 'ACTIVE' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: 680,
    maxHeight: '90%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.md + 1,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.canvas,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabItemActive: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: SPACING.lg,
  },
  formSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
    marginBottom: -4,
  },
  textInput: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    ...SHADOWS.sm,
  },
  saveBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFF',
  },
  resetDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  resetDesc: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  dangerBtnText: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.danger,
  },
  categoryPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  catPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  catPillText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  catPillTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  gstPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  gstPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  gstPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  gstPillText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  gstPillTextActive: {
    color: '#FFF',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  channelTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  channelDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  toggleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleOn: {
    backgroundColor: COLORS.successLight,
  },
  toggleOff: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.successText,
  },
});
