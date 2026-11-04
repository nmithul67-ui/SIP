import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  X,
  MessageCircle,
  Send,
  CheckCircle,
  Smartphone,
  Receipt,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, formatINR } from '../theme/tokens';
import { BillItemDocType } from '../database/schema';

interface WhatsAppInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  tableLabel: string;
  billId: string;
  items: BillItemDocType[];
  subtotal: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
}

export const WhatsAppInvoiceModal: React.FC<WhatsAppInvoiceModalProps> = ({
  visible,
  onClose,
  tableLabel,
  billId,
  items,
  subtotal,
  cgst,
  sgst,
  grandTotal,
}) => {
  const [phone, setPhone] = useState<string>('9876543210');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSendInvoice = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    setStatus('sending');
    setErrorMessage('');

    try {
      const mobile_number = cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/notifications/whatsapp-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number,
          bill_id: billId || 'INV-2026-0923-001',
          payment_status: 'paid',
        }),
      });

      if (response.ok) {
        setStatus('sent');
      } else {
        const errData = await response.json();
        setStatus('error');
        setErrorMessage(errData.detail || 'Dispatch failed');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Cannot reach FinOS backend service');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.whatsappIconBg}>
                <MessageCircle size={22} color="#25D366" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Send WhatsApp Digital Invoice</Text>
                <Text style={styles.headerSubtitle}>
                  Paperless E-Invoice • Table {tableLabel} • Bill #{billId}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {status === 'sent' ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconWrapper}>
                  <CheckCircle size={48} color={COLORS.success} />
                </View>
                <Text style={styles.successTitle}>WhatsApp Invoice Dispatched!</Text>
                <Text style={styles.successSubtitle}>
                  Digital invoice sent to <Text style={{ fontWeight: '700' }}>+91 {phone}</Text> via Twilio WhatsApp Gateway.
                </Text>

                <View style={styles.sentReceiptPreview}>
                  <Text style={styles.previewTitle}>🧾 Sent Invoice Summary</Text>
                  <Text style={styles.previewLine}>Bill ID: #{billId}</Text>
                  <Text style={styles.previewLine}>Grand Total: {formatINR(grandTotal)}</Text>
                  <Text style={styles.previewLine}>Items: {items.length} line items</Text>
                  <Text style={styles.previewLine}>Status: PAID (WhatsApp Verified)</Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                    <Text style={styles.primaryButtonText}>Done & Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
                    <Text style={styles.secondaryButtonText}>Send to Another Number</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.formContainer}>
                {/* Mobile Input */}
                <Text style={styles.label}>Customer Mobile Number (India +91)</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.prefixBadge}>
                    <Smartphone size={16} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="98765 43210"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                {errorMessage !== '' && (
                  <View style={styles.errorAlert}>
                    <AlertCircle size={16} color={COLORS.danger} style={{ marginRight: 6 }} />
                    <Text style={styles.errorAlertText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Message Preview Box */}
                <Text style={[styles.label, { marginTop: SPACING.md }]}>Live WhatsApp Text Preview</Text>
                <View style={styles.messageBox}>
                  <Text style={styles.msgHeader}>🧾 *Sharma's Bistro*</Text>
                  <Text style={styles.msgSub}>GSTIN: `27AABCB1234C1Z5`</Text>
                  <Text style={styles.msgDivider}>─────────────────────────</Text>
                  <Text style={styles.msgBody}>📋 *Invoice: {billId}*</Text>
                  <Text style={styles.msgBody}>🪑 Table: {tableLabel}</Text>
                  <Text style={styles.msgDivider}>─────────────────────────</Text>
                  {items.map((i, index) => (
                    <Text key={index} style={styles.msgItem}>
                      • {i.name} ({i.quantity} × ₹{i.price}) = *₹{i.price * i.quantity}*
                    </Text>
                  ))}
                  <Text style={styles.msgDivider}>─────────────────────────</Text>
                  <Text style={styles.msgTotal}>*GRAND TOTAL: {formatINR(grandTotal)}*</Text>
                  <Text style={styles.msgFooter}>_Thank you for dining with us! 🙏_</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendBtn, status === 'sending' && styles.disabledBtn]}
                    onPress={handleSendInvoice}
                    disabled={status === 'sending'}
                  >
                    {status === 'sending' ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Send size={18} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.sendBtnText}>Send Invoice via WhatsApp</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: 620,
    maxHeight: '90%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  whatsappIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.md + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#166534',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#15803D',
    marginTop: 1,
  },
  closeButton: {
    padding: 6,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: SPACING.lg,
  },
  formContainer: {
    gap: 4,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#25D366',
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  prefixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceSubtle,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  prefixText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: COLORS.textPrimary,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  errorAlertText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.danger,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  messageBox: {
    backgroundColor: '#075E54',
    padding: 14,
    borderRadius: 10,
    gap: 3,
  },
  msgHeader: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#ECE5DD',
  },
  msgSub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#8696A0',
  },
  msgDivider: {
    color: '#128C7E',
    fontSize: 10,
  },
  msgBody: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    color: '#ECE5DD',
  },
  msgItem: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#D1E7DD',
    marginLeft: 4,
  },
  msgTotal: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#25D366',
    marginTop: 4,
  },
  msgFooter: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#8696A0',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: SPACING.lg,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFF',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  successIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  successSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  sentReceiptPreview: {
    width: '100%',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginVertical: SPACING.md,
    gap: 4,
  },
  previewTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  previewLine: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
