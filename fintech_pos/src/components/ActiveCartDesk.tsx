import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Trash2,
  Printer,
  PauseCircle,
  CreditCard,
  Plus,
  Minus,
  Utensils,
  Receipt,
  FileCheck,
  MessageCircle,
  Zap,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, formatINR } from '../theme/tokens';
import { BillItemDocType, BillStatus } from '../database/schema';

interface ActiveCartDeskProps {
  tableLabel: string;
  workspaceMode: 'dine-in' | 'takeaway';
  billStatus: BillStatus;
  items: BillItemDocType[];
  onIncrementItem: (itemId: string) => void;
  onDecrementItem: (itemId: string) => void;
  onRemoveItem: (billItemId: string) => void;
  onClearOrder: () => void;
  onSendKOT: () => void;
  onHoldOrder: () => void;
  onCheckout: () => void;
  onOpenFintechPay?: () => void;
  onOpenWhatsApp?: () => void;
}

export const ActiveCartDesk: React.FC<ActiveCartDeskProps> = ({
  tableLabel,
  workspaceMode,
  billStatus,
  items,
  onIncrementItem,
  onDecrementItem,
  onRemoveItem,
  onClearOrder,
  onSendKOT,
  onHoldOrder,
  onCheckout,
  onOpenFintechPay,
  onOpenWhatsApp,
}) => {
  // Compute Subtotal, CGST, SGST, and Grand Total
  const { subtotal, cgst, sgst, grandTotal } = useMemo(() => {
    let sub = 0;
    let cgstSum = 0;
    let sgstSum = 0;

    items.forEach((item) => {
      const lineBase = item.price * item.quantity;
      sub += lineBase;

      // Equal CGST / SGST split in Indian GST
      const halfRate = (item.tax_rate || 5) / 2 / 100;
      cgstSum += lineBase * halfRate;
      sgstSum += lineBase * halfRate;
    });

    const total = Math.round(sub + cgstSum + sgstSum);

    return {
      subtotal: sub,
      cgst: cgstSum,
      sgst: sgstSum,
      grandTotal: total,
    };
  }, [items]);

  return (
    <View style={styles.container}>
      {/* 1. ORDER HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.tableTag}>
            <Text style={styles.tableTagText}>
              {workspaceMode === 'dine-in' ? `Table ${tableLabel}` : `QSR Token`}
            </Text>
          </View>
          <View>
            <Text style={styles.orderSubtitle}>
              {workspaceMode === 'dine-in' ? 'Dine-In Guest Order' : 'Takeaway Counter Order'}
            </Text>
            <View style={styles.statusBadgeRow}>
              <View
                style={[
                  styles.billStatusBadge,
                  billStatus === 'kot_sent' && styles.statusKotSent,
                  billStatus === 'paid' && styles.statusPaid,
                ]}
              >
                <Text
                  style={[
                    styles.billStatusText,
                    billStatus === 'kot_sent' && styles.statusKotSentText,
                    billStatus === 'paid' && styles.statusPaidText,
                  ]}
                >
                  {billStatus.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.itemCountText}>
                {items.reduce((acc, curr) => acc + curr.quantity, 0)} items
              </Text>
            </View>
          </View>
        </View>

        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClearOrder}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={COLORS.danger} style={{ marginRight: 4 }} />
            <Text style={styles.clearButtonText}>Void</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. SCROLLABLE LINE-ITEM CART */}
      <View style={styles.cartBody}>
        {items.length === 0 ? (
          <View style={styles.emptyCartContainer}>
            <Utensils size={40} color={COLORS.textSubtle} />
            <Text style={styles.emptyCartTitle}>Order is empty</Text>
            <Text style={styles.emptyCartSubtitle}>
              Tap menu items from the catalog to add them immediately
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.lineItemList}
            contentContainerStyle={styles.lineItemScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => {
              const lineTotal = item.price * item.quantity;
              return (
                <View key={item.bill_item_id} style={styles.lineItemCard}>
                  {/* Line item info */}
                  <View style={styles.lineItemMain}>
                    <Text style={styles.lineItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.lineItemMetaRow}>
                      <Text style={styles.lineItemRate}>
                        {formatINR(item.price)} each
                      </Text>
                      <View style={styles.taxPill}>
                        <Text style={styles.taxPillText}>
                          GST {item.tax_rate}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Touch Stepper Stepper: [-] [Qty] [+] */}
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => onDecrementItem(item.item_id)}
                      activeOpacity={0.7}
                    >
                      <Minus size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.stepperQtyBox}>
                      <Text style={styles.stepperQtyText}>{item.quantity}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => onIncrementItem(item.item_id)}
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Line Item Total */}
                  <View style={styles.lineItemTotalBox}>
                    <Text style={styles.lineItemTotalText}>
                      {formatINR(lineTotal)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 3. TAX & TOTAL SUMMARY (CGST 2.5% + SGST 2.5%) */}
      <View style={styles.summaryFooter}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatINR(subtotal)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>CGST (Central Tax 2.5% / 9%)</Text>
          <Text style={styles.summaryValue}>{formatINR(cgst)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>SGST (State Tax 2.5% / 9%)</Text>
          <Text style={styles.summaryValue}>{formatINR(sgst)}</Text>
        </View>

        <View style={styles.divider} />

        {/* High-Contrast Grand Total */}
        <View style={styles.grandTotalContainer}>
          <View>
            <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
            <Text style={styles.taxInclusiveText}>(Incl. of all Taxes)</Text>
          </View>
          <Text style={styles.grandTotalValue}>
            {formatINR(grandTotal)}
          </Text>
        </View>

        {/* 4. ACTIONS BAR: [ Send KOT ] [ Hold ] [ FinTech Pay ] [ Quick Pay ] */}
        <View style={styles.actionButtonsRow}>
          {/* Print / Send KOT */}
          <TouchableOpacity
            style={[
              styles.secondaryActionButton,
              items.length === 0 && styles.buttonDisabled,
            ]}
            onPress={onSendKOT}
            disabled={items.length === 0}
            activeOpacity={0.7}
          >
            <Printer size={15} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.secondaryActionText}>KOT</Text>
          </TouchableOpacity>

          {/* Hold Order */}
          <TouchableOpacity
            style={[
              styles.secondaryActionButton,
              items.length === 0 && styles.buttonDisabled,
            ]}
            onPress={onHoldOrder}
            disabled={items.length === 0}
            activeOpacity={0.7}
          >
            <PauseCircle size={15} color={COLORS.warningText} style={{ marginRight: 4 }} />
            <Text style={[styles.secondaryActionText, { color: COLORS.warningText }]}>
              Hold
            </Text>
          </TouchableOpacity>

          {/* WhatsApp E-Invoice Direct Trigger */}
          {onOpenWhatsApp && (
            <TouchableOpacity
              style={[
                styles.secondaryActionButton,
                { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
                items.length === 0 && styles.buttonDisabled,
              ]}
              onPress={onOpenWhatsApp}
              disabled={items.length === 0}
              activeOpacity={0.7}
            >
              <MessageCircle size={15} color="#166534" style={{ marginRight: 4 }} />
              <Text style={[styles.secondaryActionText, { color: '#166534' }]}>WA</Text>
            </TouchableOpacity>
          )}

          {/* FinTech Settlement (UPI QR + Credit Line) */}
          {onOpenFintechPay && (
            <TouchableOpacity
              style={[
                styles.secondaryActionButton,
                { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
                items.length === 0 && styles.buttonDisabled,
              ]}
              onPress={onOpenFintechPay}
              disabled={items.length === 0}
              activeOpacity={0.7}
            >
              <Zap size={15} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.secondaryActionText, { color: COLORS.primary }]}>FinTech</Text>
            </TouchableOpacity>
          )}

          {/* Prominent Quick Pay / Checkout */}
          <TouchableOpacity
            style={[
              styles.checkoutActionButton,
              items.length === 0 && styles.checkoutDisabled,
            ]}
            onPress={onCheckout}
            disabled={items.length === 0}
            activeOpacity={0.8}
          >
            <CreditCard size={17} color={COLORS.textInverse} style={{ marginRight: 5 }} />
            <Text style={styles.checkoutActionText}>Pay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tableTagText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textInverse,
  },
  orderSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  billStatusBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusKotSent: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  statusPaid: {
    backgroundColor: COLORS.successLight,
    borderColor: '#A7F3D0',
  },
  billStatusText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textMuted,
  },
  statusKotSentText: {
    color: '#1D4ED8',
  },
  statusPaidText: {
    color: COLORS.successText,
  },
  itemCountText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearButtonText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.dangerText,
  },
  cartBody: {
    flex: 1,
  },
  emptyCartContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyCartTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  emptyCartSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 200,
  },
  lineItemList: {
    flex: 1,
  },
  lineItemScrollContent: {
    padding: SPACING.sm,
    gap: 6,
  },
  lineItemCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineItemMain: {
    flex: 1,
    marginRight: 6,
  },
  lineItemName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  lineItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  lineItemRate: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  taxPill: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  taxPillText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textMuted,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  stepperButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  stepperQtyBox: {
    paddingHorizontal: 8,
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQtyText: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  lineItemTotalBox: {
    minWidth: 64,
    alignItems: 'flex-end',
    marginLeft: 6,
  },
  lineItemTotalText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textPrimary,
  },
  summaryFooter: {
    backgroundColor: COLORS.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 6,
  },
  grandTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  grandTotalLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: '#93C5FD',
    letterSpacing: 0.5,
  },
  taxInclusiveText: {
    fontSize: 9,
    color: '#BFDBFE',
  },
  grandTotalValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textInverse,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    minHeight: 44,
  },
  secondaryActionText: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textSecondary,
  },
  checkoutActionButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minHeight: 44,
    ...SHADOWS.sm,
  },
  checkoutActionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textInverse,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  checkoutDisabled: {
    backgroundColor: '#94A3B8',
  },
});
