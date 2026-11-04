import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  X,
  Printer,
  Utensils,
  Check,
  ChefHat,
  Send,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme/tokens';
import { BillItemDocType } from '../database/schema';
import { PrinterService } from '../services/printerService';


interface KOTModalProps {
  visible: boolean;
  onClose: () => void;
  tableLabel: string;
  waiterName?: string;
  kotNumber: number;
  items: BillItemDocType[];
  onConfirmPrint: () => void;
}

export const KOTModal: React.FC<KOTModalProps> = ({
  visible,
  onClose,
  tableLabel,
  waiterName = 'Capt. Vikram S.',
  kotNumber,
  items,
  onConfirmPrint,
}) => {
  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Top Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <ChefHat size={20} color={COLORS.primary} />
              <Text style={styles.headerTitle}>Kitchen Order Ticket (KOT)</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Thermal Slip Simulation */}
          <View style={styles.slipContainer}>
            <View style={styles.thermalSlip}>
              {/* Slip Header */}
              <View style={styles.slipHeader}>
                <Text style={styles.slipBrand}>AURA GOURMET BISTRO</Text>
                <Text style={styles.slipSub}>KITCHEN ORDER TICKET (KOT)</Text>
                <View style={styles.dashLine} />
              </View>

              {/* Slip Meta */}
              <View style={styles.slipMetaRow}>
                <Text style={styles.slipMetaText}>KOT #: {kotNumber}</Text>
                <Text style={styles.slipMetaText}>TABLE: {tableLabel}</Text>
              </View>
              <View style={styles.slipMetaRow}>
                <Text style={styles.slipMetaText}>SERVER: {waiterName}</Text>
                <Text style={styles.slipMetaText}>TIME: {currentTime}</Text>
              </View>

              <View style={styles.dashLine} />

              {/* Items Column Header */}
              <View style={styles.itemHeaderRow}>
                <Text style={styles.itemHeaderQty}>QTY</Text>
                <Text style={styles.itemHeaderDesc}>ITEM DESCRIPTION</Text>
              </View>

              <View style={styles.dashLine} />

              {/* Items List */}
              <ScrollView style={styles.slipItemsScroll} showsVerticalScrollIndicator={false}>
                {items.map((item, index) => (
                  <View key={item.bill_item_id || index} style={styles.slipItemRow}>
                    <Text style={styles.slipQty}>[ {item.quantity} ]</Text>
                    <View style={styles.slipItemDescCol}>
                      <Text style={styles.slipItemName}>{item.name}</Text>
                      {item.notes ? (
                        <Text style={styles.slipItemNotes}>* {item.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.dashLine} />

              {/* Slip Footer */}
              <View style={styles.slipFooter}>
                <Text style={styles.slipFooterText}>
                  TOTAL ITEMS: {items.reduce((acc, curr) => acc + curr.quantity, 0)}
                </Text>
                <Text style={styles.slipFooterSub}>
                  ROUTED VIA P2P MESH TO KITCHEN DISPLAY
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Action */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Dismiss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmPrintButton}
              onPress={async () => {
                try {
                  const bytes = PrinterService.generateKOTBytes({
                    billId: `KOT-${kotNumber}`,
                    tableName: tableLabel,
                    waiterName: waiterName,
                    kotNumber: kotNumber,
                    timestamp: currentTime,
                    items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
                    subtotal: 0,
                    cgst: 0,
                    sgst: 0,
                    grandTotal: 0,
                  });
                  await PrinterService.printToBluetoothOrUSB(bytes, 'Kitchen Printer');
                } catch (e) {
                  console.warn('ESC/POS printing output:', e);
                }
                onConfirmPrint();
              }}
              activeOpacity={0.8}
            >
              <Printer size={18} color={COLORS.textInverse} style={{ marginRight: 6 }} />
              <Text style={styles.confirmPrintText}>
                Print & Send KOT to Kitchen
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: 480,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.md + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  slipContainer: {
    padding: SPACING.lg,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  thermalSlip: {
    width: '100%',
    backgroundColor: '#FEFDFB', // Thermal paper off-white
    borderRadius: 6,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...SHADOWS.md,
  },
  slipHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  slipBrand: {
    fontSize: TYPOGRAPHY.fontSize.sm + 1,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: '#0F172A',
    letterSpacing: 1,
  },
  slipSub: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: '#475569',
    marginTop: 2,
  },
  dashLine: {
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#94A3B8',
    borderStyle: 'dashed',
    marginVertical: 6,
    width: '100%',
  },
  slipMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  slipMetaText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#1E293B',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  itemHeaderQty: {
    width: 60,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#475569',
  },
  itemHeaderDesc: {
    flex: 1,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#475569',
  },
  slipItemsScroll: {
    maxHeight: 200,
  },
  slipItemRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  slipQty: {
    width: 60,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: '#0F172A',
  },
  slipItemDescCol: {
    flex: 1,
  },
  slipItemName: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0F172A',
  },
  slipItemNotes: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: '#D97706',
    marginTop: 1,
  },
  slipFooter: {
    alignItems: 'center',
    paddingTop: 4,
  },
  slipFooterText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0F172A',
  },
  slipFooterSub: {
    fontSize: 9,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: '#64748B',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
  },
  confirmPrintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  confirmPrintText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textInverse,
  },
});
