import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  X,
  Zap,
  CreditCard,
  Banknote,
  QrCode,
  Users,
  CheckCircle,
  ShieldCheck,
  Package,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, formatINR } from '../theme/tokens';
import { BillItemDocType } from '../database/schema';

import { PrinterService } from '../services/printerService';

interface CheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  tableLabel: string;
  billId: string;
  items: BillItemDocType[];
  subtotal: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  onConfirmSettlement: (paymentMethod: 'cash' | 'upi' | 'card' | 'split') => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  onClose,
  tableLabel,
  billId,
  items,
  subtotal,
  cgst,
  sgst,
  grandTotal,
  onConfirmSettlement,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'split'>('cash');
  const [tenderedAmount, setTenderedAmount] = useState<string>(grandTotal.toString());
  const [splitCount, setSplitCount] = useState<number>(2);
  const [upiQrUrl, setUpiQrUrl] = useState<string | null>(null);

  const tenderedNum = parseFloat(tenderedAmount) || 0;
  const changeDue = Math.max(0, tenderedNum - grandTotal);
  const splitAmount = Math.ceil(grandTotal / splitCount);

  // Auto-connect WebSocket listener for payment push
  React.useEffect(() => {
    if (!visible) return;
    let ws: WebSocket | null = null;
    try {
      const httpUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
      const wsUrl = httpUrl.replace(/^http/, 'ws');
      ws = new WebSocket(`${wsUrl}/ws/payments/${tableLabel}`);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'PAYMENT_CONFIRMED') {
            console.log('[POS WebSocket] Payment confirmation received via push!');
            handleCompleteAndPrint('upi');
          }
        } catch (err) {
          console.warn('[POS WebSocket] Message parse error:', err);
        }
      };
    } catch (e) {
      console.warn('[POS WebSocket] Could not establish socket:', e);
    }
    return () => {
      if (ws) ws.close();
    };
  }, [visible, tableLabel]);

  const handleQuickCash = (amount: number) => {
    setTenderedAmount(amount.toString());
  };

  const handleCompleteAndPrint = async (method: 'cash' | 'upi' | 'card' | 'split') => {
    try {
      const bytes = PrinterService.generateCustomerBillBytes(
        {
          billId,
          tableName: tableLabel,
          timestamp: new Date().toLocaleString('en-IN'),
          items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
          subtotal,
          cgst,
          sgst,
          grandTotal,
          paymentMethod: method,
        },
        true // kick cash drawer RJ11 pulse
      );
      await PrinterService.printToBluetoothOrUSB(bytes, 'Receipt Printer');
    } catch (err) {
      console.warn('[Receipt Printer] Binary ESC/POS print log:', err);
    }
    onConfirmSettlement(method);
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Quick Pay & Bill Settlement</Text>
              <Text style={styles.headerSubtitle}>
                Table {tableLabel} • Bill ID: {billId}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body Container */}
          <View style={styles.body}>
            {/* Left: Payment Method Selection & Inputs */}
            <View style={styles.leftCol}>
              <Text style={styles.sectionLabel}>Select Settlement Channel</Text>
              <View style={styles.methodTabsRow}>
                <TouchableOpacity
                  style={[
                    styles.methodTab,
                    paymentMethod === 'cash' && styles.methodTabActive,
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Banknote
                    size={20}
                    color={paymentMethod === 'cash' ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.methodTabText,
                      paymentMethod === 'cash' && styles.methodTabTextActive,
                    ]}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodTab,
                    paymentMethod === 'upi' && styles.methodTabActive,
                  ]}
                  onPress={() => setPaymentMethod('upi')}
                >
                  <QrCode
                    size={20}
                    color={paymentMethod === 'upi' ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.methodTabText,
                      paymentMethod === 'upi' && styles.methodTabTextActive,
                    ]}
                  >
                    UPI QR
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodTab,
                    paymentMethod === 'card' && styles.methodTabActive,
                  ]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <CreditCard
                    size={20}
                    color={paymentMethod === 'card' ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.methodTabText,
                      paymentMethod === 'card' && styles.methodTabTextActive,
                    ]}
                  >
                    Card POS
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodTab,
                    paymentMethod === 'split' && styles.methodTabActive,
                  ]}
                  onPress={() => setPaymentMethod('split')}
                >
                  <Users
                    size={20}
                    color={paymentMethod === 'split' ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.methodTabText,
                      paymentMethod === 'split' && styles.methodTabTextActive,
                    ]}
                  >
                    Split
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Method Detail Sub-Panel */}
              <View style={styles.methodContentPanel}>
                {paymentMethod === 'cash' && (
                  <View>
                    <Text style={styles.inputLabel}>Cash Tendered by Customer</Text>
                    <View style={styles.tenderInputContainer}>
                      <Text style={styles.currencySymbol}>₹</Text>
                      <TextInput
                        style={styles.tenderInput}
                        keyboardType="numeric"
                        value={tenderedAmount}
                        onChangeText={setTenderedAmount}
                      />
                    </View>

                    {/* Quick Denominations */}
                    <View style={styles.denominationsRow}>
                      <TouchableOpacity
                        style={styles.denomPill}
                        onPress={() => handleQuickCash(grandTotal)}
                      >
                        <Text style={styles.denomText}>Exact</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.denomPill}
                        onPress={() => handleQuickCash(500)}
                      >
                        <Text style={styles.denomText}>₹500</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.denomPill}
                        onPress={() => handleQuickCash(1000)}
                      >
                        <Text style={styles.denomText}>₹1,000</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.denomPill}
                        onPress={() => handleQuickCash(2000)}
                      >
                        <Text style={styles.denomText}>₹2,000</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Change due box */}
                    <View style={styles.changeDueBox}>
                      <Text style={styles.changeDueLabel}>Balance Change to Return:</Text>
                      <Text style={styles.changeDueAmount}>
                        {formatINR(changeDue)}
                      </Text>
                    </View>
                  </View>
                )}

                {paymentMethod === 'upi' && (
                  <View style={styles.upiContainer}>
                    <View style={styles.mockQrBox}>
                      <QrCode size={110} color="#0F172A" />
                      <Text style={styles.upiVpa}>VPA: aurabistro@icici</Text>
                    </View>
                    <View style={styles.upiMeta}>
                      <Text style={styles.upiStatusTitle}>
                        Dynamic Bharat QR Active
                      </Text>
                      <Text style={styles.upiStatusDesc}>
                        Customer can scan using Google Pay, PhonePe, or Paytm for {formatINR(grandTotal)}
                      </Text>
                      <View style={styles.instantAckBadge}>
                        <CheckCircle size={14} color={COLORS.success} />
                        <Text style={styles.instantAckText}>Soundbox / Webhook Listener Ready</Text>
                      </View>
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#059669',
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          marginTop: 10,
                        }}
                        onPress={() => handleCompleteAndPrint('upi')}
                        activeOpacity={0.8}
                      >
                        <Zap size={16} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>
                          ⚡ 1-Click Approve UPI Payment
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {paymentMethod === 'card' && (
                  <View style={styles.cardContainer}>
                    <CreditCard size={48} color={COLORS.primary} />
                    <Text style={styles.cardPrompt}>Swipe, Tap, or Insert Card on POS Pinpad</Text>
                    <Text style={styles.cardSub}>
                      Pairing: Verifone V205t Terminal #04 (Connected via USB-Serial)
                    </Text>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#2563EB',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 8,
                        marginTop: 14,
                      }}
                      onPress={() => handleCompleteAndPrint('card')}
                      activeOpacity={0.8}
                    >
                      <Zap size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>
                        ⚡ 1-Click Approve Card Settlement
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {paymentMethod === 'split' && (
                  <View>
                    <Text style={styles.inputLabel}>Number of Guests Splitting</Text>
                    <View style={styles.splitCountRow}>
                      {[2, 3, 4, 5, 6].map((num) => (
                        <TouchableOpacity
                          key={num}
                          style={[
                            styles.splitNumPill,
                            splitCount === num && styles.splitNumPillActive,
                          ]}
                          onPress={() => setSplitCount(num)}
                        >
                          <Text
                            style={[
                              styles.splitNumText,
                              splitCount === num && styles.splitNumTextActive,
                            ]}
                          >
                            {num} Guests
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.splitResultBox}>
                      <Text style={styles.splitResultLabel}>Amount Per Person:</Text>
                      <Text style={styles.splitResultAmount}>
                        {formatINR(splitAmount)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Right: Bill Summary & Atomic Stock Deduction Notice */}
            <View style={styles.rightCol}>
              <Text style={styles.sectionLabel}>Order Financial Breakdown</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>Items Subtotal ({items.length})</Text>
                  <Text style={styles.summaryLineVal}>{formatINR(subtotal)}</Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>CGST (Central GST)</Text>
                  <Text style={styles.summaryLineVal}>{formatINR(cgst)}</Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>SGST (State GST)</Text>
                  <Text style={styles.summaryLineVal}>{formatINR(sgst)}</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.totalBigRow}>
                  <Text style={styles.totalBigLabel}>Net Payable</Text>
                  <Text style={styles.totalBigVal}>{formatINR(grandTotal)}</Text>
                </View>
              </View>

              {/* Phase 2 Inventory Auto-Deduction Notice */}
              <View style={styles.inventoryNoticeBox}>
                <Package size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inventoryNoticeTitle}>
                    Automated Stock Deduction
                  </Text>
                  <Text style={styles.inventoryNoticeDesc}>
                    Upon settlement, recipes for {items.length} ordered items will be resolved and deducted from raw ingredients automatically.
                  </Text>
                </View>
              </View>

              {/* Confirm Settlement Button */}
              <TouchableOpacity
                style={styles.settleButton}
                onPress={() => handleCompleteAndPrint(paymentMethod)}
                activeOpacity={0.8}
              >
                <ShieldCheck size={20} color={COLORS.textInverse} style={{ marginRight: 8 }} />
                <Text style={styles.settleButtonText}>
                  Complete Payment & Settle Table
                </Text>
              </TouchableOpacity>
            </View>
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
    width: '80%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
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
  body: {
    flexDirection: 'row',
    padding: SPACING.xl,
    gap: SPACING.xl,
  },
  leftCol: {
    flex: 1.2,
  },
  rightCol: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  methodTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  methodTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 4,
  },
  methodTabActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  methodTabText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textMuted,
  },
  methodTabTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  methodContentPanel: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.lg,
    minHeight: 180,
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  tenderInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
    marginRight: 6,
  },
  tenderInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textPrimary,
  },
  denominationsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  denomPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    borderRadius: 6,
  },
  denomText: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textSecondary,
  },
  changeDueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  changeDueLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.successText,
  },
  changeDueAmount: {
    fontSize: TYPOGRAPHY.fontSize.md + 1,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.successDark,
  },
  upiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mockQrBox: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  upiVpa: {
    fontSize: 9,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  upiMeta: {
    flex: 1,
  },
  upiStatusTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  upiStatusDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 15,
  },
  instantAckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  instantAckText: {
    fontSize: 10,
    color: COLORS.successText,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  cardPrompt: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  cardSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  splitCountRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  splitNumPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  splitNumPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  splitNumText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
  },
  splitNumTextActive: {
    color: COLORS.textInverse,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  splitResultBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 8,
  },
  splitResultLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
  },
  splitResultAmount: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.primaryDark,
  },
  summaryCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.md,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLineLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  summaryLineVal: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalBigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBigLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textPrimary,
  },
  totalBigVal: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.primary,
  },
  inventoryNoticeBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  inventoryNoticeTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primaryDark,
  },
  inventoryNoticeDesc: {
    fontSize: 10,
    color: COLORS.primary,
    marginTop: 2,
    lineHeight: 14,
  },
  settleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 14,
    ...SHADOWS.md,
  },
  settleButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textInverse,
  },
});
