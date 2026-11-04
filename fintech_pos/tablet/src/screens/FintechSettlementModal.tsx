/**
 * tablet/src/screens/FintechSettlementModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 4: Professional React Native FinTech Settlement Modal
 *
 * Three-panel fintech checkout overlay:
 *  ┌──────────────────────────────────────────────────────────┐
 *  │  [Dynamic UPI QR]  [Credit Line on UPI]  [WhatsApp]      │
 *  └──────────────────────────────────────────────────────────┘
 *
 * Features:
 *  - Tab 1: Dynamic UPI QR with countdown timer & live payment status polling
 *  - Tab 2: Credit Line on UPI selector with available limit display
 *  - Tab 3: WhatsApp e-invoice toggle with mobile input & send button
 *  - Integrated Account Aggregator "Connect Your Bank" consent CTA
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BadgeCheck,
  Banknote,
  ChevronRight,
  Clock,
  CreditCard,
  Link,
  MessageCircle,
  QrCode,
  RefreshCw,
  Send,
  Shield,
  Smartphone,
  TrendingUp,
  Wifi,
  X,
  Zap,
} from 'lucide-react-native';

import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, formatINR } from '../../src/theme/tokens';
import { BillItemDocType } from '../../src/database/schema';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────────────────

type SettlementTab = 'upi_qr' | 'credit_line' | 'whatsapp';
type PaymentStatus = 'idle' | 'generating' | 'awaiting' | 'paid' | 'failed' | 'timeout';
type WhatsAppStatus = 'idle' | 'sending' | 'sent' | 'error';

const QR_TIMEOUT_SECONDS = 300; // 5 minutes
const POLL_INTERVAL_MS   = 3000;

const CREDIT_ACCOUNTS = [
  {
    id:         'CL-HDFC-001',
    bank:       'HDFC Bank',
    limit:      150000,
    available:  89500,
    interest:   '1.5% / month',
    color:      '#003366',
  },
  {
    id:         'CL-ICICI-002',
    bank:       'ICICI Bank',
    limit:      75000,
    available:  61200,
    interest:   '1.8% / month',
    color:      '#B5121B',
  },
  {
    id:         'CL-KOTAK-003',
    bank:       'Kotak Mahindra',
    limit:      100000,
    available:  100000,
    interest:   '1.65% / month',
    color:      '#EE1C25',
  },
];

export interface FintechSettlementModalProps {
  visible:      boolean;
  onClose:      () => void;
  tableLabel:   string;
  billId:       string;
  items:        BillItemDocType[];
  subtotal:     number;
  cgst:         number;
  sgst:         number;
  grandTotal:   number;
  merchantVpa:  string;
  businessName: string;
  onPaymentConfirmed: (method: 'upi' | 'credit_line') => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

/** Animated pulsing dot for "awaiting payment" status */
const PulsingDot: React.FC<{ color: string }> = ({ color }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue:  1.4,
          duration: 700,
          easing:   Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue:  1,
          duration: 700,
          easing:   Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pulsingDot,
        { backgroundColor: color, transform: [{ scale: pulseAnim }] },
      ]}
    />
  );
};

/** Countdown timer bar */
const CountdownBar: React.FC<{ seconds: number; total: number }> = ({
  seconds,
  total,
}) => {
  const progress = seconds / total;
  const color =
    progress > 0.5 ? COLORS.success :
    progress > 0.2 ? COLORS.warning :
    COLORS.danger;

  const widthAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue:  progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.countdownTrack}>
      <Animated.View
        style={[
          styles.countdownFill,
          {
            backgroundColor: color,
            width: widthAnim.interpolate({
              inputRange:  [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal
// ─────────────────────────────────────────────────────────────────────────────

export const FintechSettlementModal: React.FC<FintechSettlementModalProps> = ({
  visible,
  onClose,
  tableLabel,
  billId,
  items,
  subtotal,
  cgst,
  sgst,
  grandTotal,
  merchantVpa,
  businessName,
  onPaymentConfirmed,
}) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]     = useState<SettlementTab>('upi_qr');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [qrImageUrl, setQrImageUrl]   = useState<string | null>(null);
  const [countdown, setCountdown]     = useState(QR_TIMEOUT_SECONDS);

  const [selectedCreditAccount, setSelectedCreditAccount] = useState<string | null>(null);
  const [creditStatus, setCreditStatus] = useState<'idle' | 'processing' | 'approved' | 'failed'>('idle');

  const [whatsappMobile, setWhatsappMobile] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>('idle');

  const [aaConsentUrl, setAaConsentUrl] = useState<string | null>(null);

  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnim      = useRef(new Animated.Value(300)).current;

  // ── Animations ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue:         0,
        tension:         80,
        friction:        12,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(300);
      _resetState();
    }
  }, [visible]);

  const _resetState = () => {
    setActiveTab('upi_qr');
    setPaymentStatus('idle');
    setQrImageUrl(null);
    setCountdown(QR_TIMEOUT_SECONDS);
    setSelectedCreditAccount(null);
    setCreditStatus('idle');
    setWhatsappStatus('idle');
    _clearIntervals();
  };

  const _clearIntervals = () => {
    if (pollRef.current)      clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current      = null;
    countdownRef.current = null;
  };

  useEffect(() => () => _clearIntervals(), []);

  // ── UPI QR Generation ──────────────────────────────────────────────────────
  const handleGenerateQR = useCallback(async () => {
    setPaymentStatus('generating');
    setCountdown(QR_TIMEOUT_SECONDS);

    try {
      // Call backend: POST /api/v1/fintech/upi/generate-qr
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/fintech/upi/generate-qr`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            bill_id:      billId,
            amount:       grandTotal,
            merchant_vpa: merchantVpa,
            remarks:      `Payment for Table ${tableLabel}`,
          }),
        }
      );

      if (!response.ok) throw new Error('QR generation failed');

      const data = await response.json();

      if (data.success && data.qr_code_url) {
        setQrImageUrl(data.qr_code_url);
        setPaymentStatus('awaiting');
        _startCountdownAndPolling();
      } else {
        throw new Error(data.error_message || 'Unknown error');
      }
    } catch (err) {
      console.error('[FintechModal] QR error:', err);
      setPaymentStatus('failed');
    }
  }, [billId, grandTotal, merchantVpa, tableLabel]);

  const _startCountdownAndPolling = () => {
    _clearIntervals();

    // Countdown
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setPaymentStatus('timeout');
          _clearIntervals();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Payment status polling
    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/fintech/upi/status/${billId}`
        );
        const data = await resp.json();
        if (data.status === 'paid') {
          setPaymentStatus('paid');
          _clearIntervals();
          setTimeout(() => onPaymentConfirmed('upi'), 1500);
        }
      } catch {
        // Silent — network transient errors during polling are expected
      }
    }, POLL_INTERVAL_MS);
  };

  // ── Credit Line Checkout ───────────────────────────────────────────────────
  const handleCreditLineCheckout = useCallback(async () => {
    if (!selectedCreditAccount) return;

    setCreditStatus('processing');

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/fintech/upi/credit-checkout`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            bill_id:           billId,
            amount:            grandTotal,
            supplier_vpa:      merchantVpa,
            credit_account_id: selectedCreditAccount,
            purpose:           `Bill ${billId} — Table ${tableLabel}`,
          }),
        }
      );
      const data = await response.json();

      if (data.success) {
        setCreditStatus('approved');
        setTimeout(() => onPaymentConfirmed('credit_line'), 1500);
      } else {
        setCreditStatus('failed');
      }
    } catch {
      setCreditStatus('failed');
    }
  }, [selectedCreditAccount, billId, grandTotal, merchantVpa, tableLabel]);

  // ── WhatsApp Dispatch ──────────────────────────────────────────────────────
  const handleSendWhatsApp = useCallback(async () => {
    if (!whatsappMobile.trim() || whatsappMobile.length < 10) {
      Alert.alert('Invalid Number', 'Enter a valid 10-digit mobile number');
      return;
    }

    setWhatsappStatus('sending');

    try {
      const mobile = whatsappMobile.startsWith('+')
        ? whatsappMobile
        : `+91${whatsappMobile.replace(/\D/g, '')}`;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/notifications/whatsapp-invoice`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            mobile_number:  mobile,
            bill_id:        billId,
            payment_status: paymentStatus === 'paid' ? 'paid' : 'unpaid',
          }),
        }
      );

      if (response.ok) {
        setWhatsappStatus('sent');
      } else {
        setWhatsappStatus('error');
      }
    } catch {
      setWhatsappStatus('error');
    }
  }, [whatsappMobile, billId, paymentStatus]);

  // ── AA Consent ─────────────────────────────────────────────────────────────
  const handleConnectBank = useCallback(() => {
    Alert.alert(
      'Connect Your Bank',
      'This will launch the Account Aggregator consent flow (Setu AA Gateway). Your bank statement will be fetched securely to reconcile POS sales.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            // In production: call POST /api/v1/fintech/aa/consent-request
            // then render the returned consent_url in react-native-webview
            Alert.alert(
              'AA Gateway',
              'In production, this opens the Setu WebView consent flow where you approve bank access via OTP.'
            );
          },
        },
      ]
    );
  }, []);

  // ── Timer formatting ───────────────────────────────────────────────────────
  const countdownFormatted = useMemo(() => {
    const m = Math.floor(countdown / 60);
    const s = countdown % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [countdown]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.headerIconBadge}>
                <Zap size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.modalTitle}>FinTech Settlement</Text>
                <Text style={styles.modalSubtitle}>
                  Table {tableLabel} · Bill {billId.slice(-8).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.modalHeaderRight}>
              <View style={styles.amountBadge}>
                <Text style={styles.amountBadgeLabel}>TOTAL</Text>
                <Text style={styles.amountBadgeValue}>{formatINR(grandTotal)}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Tab Bar ────────────────────────────────────────────────── */}
          <View style={styles.tabBar}>
            {(
              [
                { key: 'upi_qr',      label: 'UPI QR',      Icon: QrCode      },
                { key: 'credit_line', label: 'Credit Line',  Icon: CreditCard  },
                { key: 'whatsapp',    label: 'WhatsApp',     Icon: MessageCircle},
              ] as { key: SettlementTab; label: string; Icon: any }[]
            ).map(({ key, label, Icon }) => (
              <TouchableOpacity
                key={key}
                style={[styles.tabItem, activeTab === key && styles.tabItemActive]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.7}
              >
                <Icon
                  size={16}
                  color={activeTab === key ? COLORS.primary : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === key && styles.tabLabelActive,
                  ]}
                >
                  {label}
                </Text>
                {activeTab === key && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Tab Content ─────────────────────────────────────────────── */}
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabContentInner}
            showsVerticalScrollIndicator={false}
          >
            {/* ════════ TAB 1: Dynamic UPI QR ════════ */}
            {activeTab === 'upi_qr' && (
              <View style={styles.tabPane}>

                {/* Bill summary strip */}
                <View style={styles.billSummaryStrip}>
                  {[
                    ['Subtotal', formatINR(subtotal)],
                    ['CGST',     formatINR(cgst)],
                    ['SGST',     formatINR(sgst)],
                  ].map(([label, val]) => (
                    <View key={label} style={styles.billSummaryItem}>
                      <Text style={styles.billSummaryLabel}>{label}</Text>
                      <Text style={styles.billSummaryValue}>{val}</Text>
                    </View>
                  ))}
                  <View style={[styles.billSummaryItem, styles.billSummaryTotal]}>
                    <Text style={styles.billSummaryTotalLabel}>TOTAL</Text>
                    <Text style={styles.billSummaryTotalValue}>{formatINR(grandTotal)}</Text>
                  </View>
                </View>

                {/* QR Panel */}
                <View style={styles.qrPanel}>
                  {paymentStatus === 'idle' && (
                    <TouchableOpacity
                      style={styles.generateQrBtn}
                      onPress={handleGenerateQR}
                      activeOpacity={0.8}
                    >
                      <QrCode size={28} color="#FFFFFF" />
                      <Text style={styles.generateQrBtnText}>Generate UPI QR</Text>
                      <Text style={styles.generateQrBtnSub}>
                        Dynamic · Single-use · {formatINR(grandTotal)} pre-encoded
                      </Text>
                    </TouchableOpacity>
                  )}

                  {paymentStatus === 'generating' && (
                    <View style={styles.qrStatusBox}>
                      <ActivityIndicator size="large" color={COLORS.primary} />
                      <Text style={styles.qrStatusText}>Generating via Decentro…</Text>
                    </View>
                  )}

                  {paymentStatus === 'awaiting' && (
                    <View style={styles.qrActiveBox}>
                      {/* QR placeholder (real: <Image source={{ uri: qrImageUrl }} />) */}
                      <View style={styles.qrImagePlaceholder}>
                        <QrCode size={100} color={COLORS.primary} />
                        <Text style={styles.qrPlaceholderText}>
                          Scan with any UPI app
                        </Text>
                        <Text style={styles.qrAmountOverlay}>
                          {formatINR(grandTotal)}
                        </Text>
                      </View>

                      <View style={styles.qrAwaitingRow}>
                        <PulsingDot color={COLORS.warning} />
                        <Text style={styles.qrAwaitingText}>Awaiting payment…</Text>
                      </View>

                      <CountdownBar seconds={countdown} total={QR_TIMEOUT_SECONDS} />
                      <View style={styles.countdownLabelRow}>
                        <Clock size={12} color={COLORS.textMuted} />
                        <Text style={styles.countdownText}>
                          Expires in {countdownFormatted}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.refreshBtn}
                        onPress={handleGenerateQR}
                      >
                        <RefreshCw size={14} color={COLORS.textSecondary} />
                        <Text style={styles.refreshBtnText}>Regenerate QR</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {paymentStatus === 'paid' && (
                    <View style={styles.paymentSuccessBox}>
                      <View style={styles.successIcon}>
                        <BadgeCheck size={56} color={COLORS.success} />
                      </View>
                      <Text style={styles.successTitle}>Payment Received!</Text>
                      <Text style={styles.successSubtitle}>
                        {formatINR(grandTotal)} via UPI · Table {tableLabel}
                      </Text>
                    </View>
                  )}

                  {paymentStatus === 'timeout' && (
                    <View style={styles.qrStatusBox}>
                      <Clock size={36} color={COLORS.warning} />
                      <Text style={styles.qrStatusText}>QR Expired</Text>
                      <TouchableOpacity
                        style={styles.generateQrBtn}
                        onPress={handleGenerateQR}
                      >
                        <RefreshCw size={18} color="#FFF" />
                        <Text style={styles.generateQrBtnText}>Generate New QR</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {paymentStatus === 'failed' && (
                    <View style={styles.qrStatusBox}>
                      <Text style={[styles.qrStatusText, { color: COLORS.danger }]}>
                        QR generation failed
                      </Text>
                      <TouchableOpacity
                        style={styles.generateQrBtn}
                        onPress={handleGenerateQR}
                      >
                        <RefreshCw size={18} color="#FFF" />
                        <Text style={styles.generateQrBtnText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* VPA info */}
                <View style={styles.vpaInfoRow}>
                  <Wifi size={14} color={COLORS.textMuted} />
                  <Text style={styles.vpaInfoText}>Merchant VPA: {merchantVpa}</Text>
                </View>
              </View>
            )}

            {/* ════════ TAB 2: Credit Line on UPI ════════ */}
            {activeTab === 'credit_line' && (
              <View style={styles.tabPane}>
                <View style={styles.creditHeaderCard}>
                  <TrendingUp size={20} color={COLORS.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.creditHeaderTitle}>Credit Line on UPI</Text>
                    <Text style={styles.creditHeaderSub}>
                      Settle supplier orders from your pre-sanctioned bank credit line
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Select Credit Account</Text>

                {CREDIT_ACCOUNTS.map((account) => {
                  const isSelected = selectedCreditAccount === account.id;
                  const utilization = ((account.limit - account.available) / account.limit) * 100;
                  return (
                    <TouchableOpacity
                      key={account.id}
                      style={[
                        styles.creditAccountCard,
                        isSelected && styles.creditAccountCardActive,
                      ]}
                      onPress={() => setSelectedCreditAccount(account.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.creditAccountHeader}>
                        <View
                          style={[
                            styles.bankColorDot,
                            { backgroundColor: account.color },
                          ]}
                        />
                        <Text style={styles.bankName}>{account.bank}</Text>
                        {isSelected && (
                          <BadgeCheck size={18} color={COLORS.primary} />
                        )}
                      </View>

                      <View style={styles.creditLimitRow}>
                        <View>
                          <Text style={styles.creditLimitLabel}>Available</Text>
                          <Text style={styles.creditLimitValue}>
                            {formatINR(account.available)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.creditLimitLabel}>Total Limit</Text>
                          <Text style={styles.creditLimitTotal}>
                            {formatINR(account.limit)}
                          </Text>
                        </View>
                      </View>

                      {/* Utilization bar */}
                      <View style={styles.utilizationTrack}>
                        <View
                          style={[
                            styles.utilizationFill,
                            {
                              width:           `${utilization}%` as any,
                              backgroundColor: utilization > 80 ? COLORS.danger : COLORS.primary,
                            },
                          ]}
                        />
                      </View>

                      <Text style={styles.interestRate}>
                        Interest: {account.interest}
                      </Text>

                      {/* Warning if bill exceeds available credit */}
                      {grandTotal > account.available && (
                        <View style={styles.creditWarning}>
                          <Text style={styles.creditWarningText}>
                            ⚠ Bill amount exceeds available credit
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Checkout Button */}
                {creditStatus === 'idle' && (
                  <TouchableOpacity
                    style={[
                      styles.creditCheckoutBtn,
                      (!selectedCreditAccount ||
                        CREDIT_ACCOUNTS.find(a => a.id === selectedCreditAccount)!
                          ?.available < grandTotal) && styles.btnDisabled,
                    ]}
                    onPress={handleCreditLineCheckout}
                    disabled={
                      !selectedCreditAccount ||
                      (CREDIT_ACCOUNTS.find(a => a.id === selectedCreditAccount)?.available ?? 0) < grandTotal
                    }
                    activeOpacity={0.8}
                  >
                    <CreditCard size={18} color="#FFF" />
                    <Text style={styles.creditCheckoutBtnText}>
                      Pay {formatINR(grandTotal)} via Credit Line
                    </Text>
                  </TouchableOpacity>
                )}

                {creditStatus === 'processing' && (
                  <View style={styles.qrStatusBox}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.qrStatusText}>Initiating via Decentro…</Text>
                  </View>
                )}

                {creditStatus === 'approved' && (
                  <View style={styles.paymentSuccessBox}>
                    <BadgeCheck size={48} color={COLORS.success} />
                    <Text style={styles.successTitle}>Credit Line Approved!</Text>
                    <Text style={styles.successSubtitle}>
                      Transaction logged to credit ledger for day-end repayment
                    </Text>
                  </View>
                )}

                {creditStatus === 'failed' && (
                  <View style={styles.qrStatusBox}>
                    <Text style={[styles.qrStatusText, { color: COLORS.danger }]}>
                      Credit checkout failed. Retry or select another account.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ════════ TAB 3: WhatsApp + Account Aggregator ════════ */}
            {activeTab === 'whatsapp' && (
              <View style={styles.tabPane}>

                {/* WhatsApp E-Invoice Section */}
                <View style={styles.whatsappCard}>
                  <View style={styles.whatsappCardHeader}>
                    <View style={styles.whatsappIconBadge}>
                      <MessageCircle size={18} color="#25D366" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.whatsappCardTitle}>WhatsApp E-Invoice</Text>
                      <Text style={styles.whatsappCardSub}>
                        Send itemized tax invoice directly to customer
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Customer Mobile Number</Text>
                  <View style={styles.mobileInputRow}>
                    <View style={styles.dialCodeBox}>
                      <Smartphone size={14} color={COLORS.textSecondary} />
                      <Text style={styles.dialCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.mobileInput}
                      placeholder="9876543210"
                      placeholderTextColor={COLORS.textSubtle}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={whatsappMobile}
                      onChangeText={setWhatsappMobile}
                    />
                  </View>

                  {/* Preview of what will be sent */}
                  <View style={styles.invoicePreview}>
                    <Text style={styles.invoicePreviewLabel}>INVOICE PREVIEW</Text>
                    <Text style={styles.invoicePreviewText}>
                      🧾 *{businessName}*{'\n'}
                      📋 Bill: {billId.slice(-8).toUpperCase()}{'\n'}
                      ─────────────────{'\n'}
                      {items.slice(0, 3).map(it =>
                        `  • ${it.name} × ${it.quantity} = ${formatINR(it.price * it.quantity)}`
                      ).join('\n')}
                      {items.length > 3 ? `\n  ... +${items.length - 3} more items` : ''}{'\n'}
                      ─────────────────{'\n'}
                      Subtotal:  {formatINR(subtotal)}{'\n'}
                      CGST:      {formatINR(cgst)}{'\n'}
                      SGST:      {formatINR(sgst)}{'\n'}
                      ─────────────────{'\n'}
                      *TOTAL: {formatINR(grandTotal)}*
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.sendWhatsAppBtn,
                      whatsappStatus === 'sent'   && styles.sendWhatsAppBtnSent,
                      whatsappStatus === 'sending' && styles.btnDisabled,
                    ]}
                    onPress={handleSendWhatsApp}
                    disabled={whatsappStatus === 'sending' || whatsappStatus === 'sent'}
                    activeOpacity={0.8}
                  >
                    {whatsappStatus === 'sending' ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : whatsappStatus === 'sent' ? (
                      <>
                        <BadgeCheck size={16} color="#FFF" />
                        <Text style={styles.sendWhatsAppBtnText}>Invoice Sent!</Text>
                      </>
                    ) : (
                      <>
                        <Send size={16} color="#FFF" />
                        <Text style={styles.sendWhatsAppBtnText}>Send WhatsApp Invoice</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {whatsappStatus === 'error' && (
                    <Text style={styles.whatsappError}>
                      Failed to send. Check number and retry.
                    </Text>
                  )}
                </View>

                {/* Account Aggregator Section */}
                <View style={styles.aaCard}>
                  <View style={styles.aaCardHeader}>
                    <View style={styles.aaIconBadge}>
                      <Shield size={18} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.aaCardTitle}>Account Aggregator</Text>
                      <Text style={styles.aaCardSub}>
                        Auto-reconcile POS sales with bank deposits
                      </Text>
                    </View>
                  </View>

                  <View style={styles.aaFeatureList}>
                    {[
                      'Fetches bank statement via Setu AA (RBI regulated)',
                      'Compares UPI credits against daily POS totals',
                      'Flags discrepancies automatically',
                    ].map((feature, i) => (
                      <View key={i} style={styles.aaFeatureRow}>
                        <BadgeCheck size={14} color={COLORS.success} />
                        <Text style={styles.aaFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.connectBankBtn}
                    onPress={handleConnectBank}
                    activeOpacity={0.8}
                  >
                    <Link size={16} color={COLORS.primary} />
                    <Text style={styles.connectBankBtnText}>Connect Your Bank Account</Text>
                    <ChevronRight size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const C = COLORS as any;

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent:  'flex-end',
    alignItems:      'center',
  },
  modalContainer: {
    width:           '96%',
    maxHeight:       '90%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    borderRadius:    16,
    overflow:        'hidden',
    ...SHADOWS.lg,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  modalHeader: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    padding:          SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor:  '#0F172A',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  headerIconBadge: {
    width:           36,
    height:          36,
    borderRadius:    10,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  modalTitle: {
    fontSize:   TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color:      '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color:    '#94A3B8',
    marginTop: 1,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  amountBadge: {
    backgroundColor: '#1E293B',
    borderRadius:    8,
    paddingHorizontal: 12,
    paddingVertical:   6,
    alignItems:     'center',
    borderWidth:    1,
    borderColor:    '#334155',
  },
  amountBadgeLabel: {
    fontSize: 9,
    color:    '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountBadgeValue: {
    fontSize:   TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color:      '#4ADE80',
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  closeBtn: {
    width:           34,
    height:          34,
    borderRadius:    8,
    backgroundColor: '#1E293B',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     '#334155',
  },

  // ── Tab Bar ──────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection:    'row',
    backgroundColor:  COLORS.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent: 'center',
    gap:           6,
    paddingVertical: 12,
    position:      'relative',
  },
  tabItemActive: {
    backgroundColor: COLORS.surface,
  },
  tabLabel: {
    fontSize:   TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color:      COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  tabIndicator: {
    position:        'absolute',
    bottom:          0,
    left:            12,
    right:           12,
    height:          2,
    backgroundColor: COLORS.primary,
    borderRadius:    1,
  },

  // ── Tab Content ───────────────────────────────────────────────────────────────
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: SPACING.md,
  },
  tabPane: {
    gap: 12,
  },

  // ── Bill Summary Strip ────────────────────────────────────────────────────────
  billSummaryStrip: {
    flexDirection:   'row',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius:    10,
    padding:         SPACING.sm,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  billSummaryItem: {
    flex:       1,
    alignItems: 'center',
  },
  billSummaryLabel: {
    fontSize: 10,
    color:    COLORS.textMuted,
  },
  billSummaryValue: {
    fontSize:   TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color:      COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  billSummaryTotal: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  billSummaryTotalLabel: {
    fontSize: 10,
    color:    COLORS.textMuted,
    fontWeight: '700',
  },
  billSummaryTotalValue: {
    fontSize:   TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color:      COLORS.primary,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },

  // ── UPI QR Panel ─────────────────────────────────────────────────────────────
  qrPanel: {
    alignItems: 'center',
    gap:        12,
  },
  generateQrBtn: {
    backgroundColor: COLORS.primary,
    borderRadius:    14,
    padding:         SPACING.lg,
    alignItems:      'center',
    gap:             8,
    width:           '100%',
    ...SHADOWS.md,
  },
  generateQrBtnText: {
    fontSize:   TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color:      '#FFFFFF',
  },
  generateQrBtnSub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color:    '#BFDBFE',
  },
  qrStatusBox: {
    alignItems:     'center',
    justifyContent: 'center',
    padding:        SPACING.xl,
    gap:            12,
    minHeight:      160,
  },
  qrStatusText: {
    fontSize:   TYPOGRAPHY.fontSize.sm,
    color:      COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign:  'center',
  },
  qrActiveBox: {
    alignItems: 'center',
    gap:        10,
    width:      '100%',
  },
  qrImagePlaceholder: {
    width:           220,
    height:          220,
    backgroundColor: '#F8FAFC',
    borderRadius:    16,
    borderWidth:     2,
    borderColor:     COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    ...SHADOWS.sm,
  },
  qrPlaceholderText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color:    COLORS.textSecondary,
    textAlign: 'center',
  },
  qrAmountOverlay: {
    fontSize:   TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color:      COLORS.primary,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  qrAwaitingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  pulsingDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  qrAwaitingText: {
    fontSize:   TYPOGRAPHY.fontSize.sm,
    color:      COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  countdownTrack: {
    width:           '100%',
    height:          4,
    backgroundColor: COLORS.border,
    borderRadius:    2,
    overflow:        'hidden',
  },
  countdownFill: {
    height:       4,
    borderRadius: 2,
  },
  countdownLabelRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  countdownText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color:    COLORS.textMuted,
  },
  refreshBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius:   6,
    borderWidth:    1,
    borderColor:    COLORS.border,
  },
  refreshBtnText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color:    COLORS.textSecondary,
  },
  paymentSuccessBox: {
    alignItems:     'center',
    justifyContent: 'center',
    padding:        SPACING.xl,
    gap:            10,
    minHeight:      180,
  },
  successIcon: {
    backgroundColor: '#F0FDF4',
    width:           80,
    height:          80,
    borderRadius:    40,
    alignItems:      'center',
    justifyContent:  'center',
  },
  successTitle: {
    fontSize:   TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color:      COLORS.textPrimary,
  },
  successSubtitle: {
    fontSize:  TYPOGRAPHY.fontSize.sm,
    color:     COLORS.textMuted,
    textAlign: 'center',
  },
  vpaInfoRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    justifyContent: 'center',
  },
  vpaInfoText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color:    COLORS.textMuted,
  },

  // ── Credit Line ───────────────────────────────────────────────────────────────
  creditHeaderCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#EFF6FF',
    borderRadius:    10,
    padding:         SPACING.md,
    borderWidth:     1,
    borderColor:     '#BFDBFE',
  },
  creditHeaderTitle: {
    fontSize:   TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color:      COLORS.primary,
  },
  creditHeaderSub: {
    fontSize:  TYPOGRAPHY.fontSize.xs,
    color:     '#3B82F6',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize:   TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color:      COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  creditAccountCard: {
    backgroundColor: COLORS.surface,
    borderRadius:    12,
    padding:         SPACING.md,
    borderWidth:     1.5,
    borderColor:     COLORS.border,
    gap:             8,
  },
  creditAccountCardActive: {
    borderColor:     COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  creditAccountHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  bankColorDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  bankName: {
    flex:       1,
    fontSize:   TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color:      COLORS.textPrimary,
  },
  creditLimitRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  creditLimitLabel: {
    fontSize: 10,
    color:    COLORS.textMuted,
  },
  creditLimitValue: {
    fontSize:   TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color:      COLORS.success,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  creditLimitTotal: {
    fontSize:   TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color:      COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  utilizationTrack: {
    height:          5,
    backgroundColor: COLORS.border,
    borderRadius:    3,
    overflow:        'hidden',
  },
  utilizationFill: {
    height:       5,
    borderRadius: 3,
  },
  interestRate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color:    COLORS.textMuted,
  },
  creditWarning: {
    backgroundColor: '#FEF3C7',
    borderRadius:    6,
    padding:         6,
    borderWidth:     1,
    borderColor:     '#FCD34D',
  },
  creditWarningText: {
    fontSize:  TYPOGRAPHY.fontSize.xs,
    color:     '#92400E',
    textAlign: 'center',
  },
  creditCheckoutBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: COLORS.primary,
    borderRadius:    12,
    padding:         SPACING.md,
    marginTop:       4,
    ...SHADOWS.sm,
  },
  creditCheckoutBtnText: {
    fontSize:   TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color:      '#FFFFFF',
  },

  // ── WhatsApp Section ──────────────────────────────────────────────────────────
  whatsappCard: {
    backgroundColor: COLORS.surface,
    borderRadius:    14,
    padding:         SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
    gap:             10,
  },
  whatsappCardHeader: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  whatsappIconBadge: {
    width:           36,
    height:          36,
    borderRadius:    10,
    backgroundColor: '#DCF8C6',
    alignItems:      'center',
    justifyContent:  'center',
  },
  whatsappCardTitle: {
    fontSize:   TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color:      COLORS.textPrimary,
  },
  whatsappCardSub: {
    fontSize:  TYPOGRAPHY.fontSize.xs,
    color:     COLORS.textMuted,
    marginTop: 2,
  },
  inputLabel: {
    fontSize:   TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color:      COLORS.textSecondary,
    marginBottom: -4,
  },
  mobileInputRow: {
    flexDirection: 'row',
    borderWidth:   1,
    borderColor:   COLORS.border,
    borderRadius:  8,
    overflow:      'hidden',
    height:        44,
  },
  dialCodeBox: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  dialCodeText: {
    fontSize:   TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color:      COLORS.textSecondary,
  },
  mobileInput: {
    flex:       1,
    paddingHorizontal: SPACING.sm,
    fontSize:   TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color:      COLORS.textPrimary,
  },
  invoicePreview: {
    backgroundColor: '#F0FFF4',
    borderRadius:    8,
    padding:         SPACING.sm,
    borderWidth:     1,
    borderColor:     '#A7F3D0',
  },
  invoicePreviewLabel: {
    fontSize:   9,
    fontWeight: '700',
    color:      COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom:  4,
  },
  invoicePreviewText: {
    fontSize:   TYPOGRAPHY.fontSize.xs,
    color:      COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    lineHeight: 18,
  },
  sendWhatsAppBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: '#25D366',
    borderRadius:    10,
    padding:         SPACING.sm,
    ...SHADOWS.sm,
  },
  sendWhatsAppBtnSent: {
    backgroundColor: COLORS.success,
  },
  sendWhatsAppBtnText: {
    fontSize:   TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color:      '#FFFFFF',
  },
  whatsappError: {
    fontSize:  TYPOGRAPHY.fontSize.xs,
    color:     COLORS.danger,
    textAlign: 'center',
  },

  // ── Account Aggregator Card ──────────────────────────────────────────────────
  aaCard: {
    backgroundColor: COLORS.surface,
    borderRadius:    14,
    padding:         SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
    gap:             10,
  },
  aaCardHeader: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  aaIconBadge: {
    width:           36,
    height:          36,
    borderRadius:    10,
    backgroundColor: '#EFF6FF',
    alignItems:      'center',
    justifyContent:  'center',
  },
  aaCardTitle: {
    fontSize:   TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color:      COLORS.textPrimary,
  },
  aaCardSub: {
    fontSize:  TYPOGRAPHY.fontSize.xs,
    color:     COLORS.textMuted,
    marginTop: 2,
  },
  aaFeatureList: {
    gap: 6,
  },
  aaFeatureRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           6,
  },
  aaFeatureText: {
    flex:       1,
    fontSize:   TYPOGRAPHY.fontSize.xs,
    color:      COLORS.textSecondary,
    lineHeight: 18,
  },
  connectBankBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: '#EFF6FF',
    borderRadius:    10,
    padding:         SPACING.sm,
    borderWidth:     1,
    borderColor:     '#BFDBFE',
  },
  connectBankBtnText: {
    flex:       1,
    fontSize:   TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color:      COLORS.primary,
  },

  // ── Shared ────────────────────────────────────────────────────────────────────
  btnDisabled: {
    opacity: 0.45,
  },
});
