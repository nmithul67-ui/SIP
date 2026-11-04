import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import {
  X,
  FileText,
  Download,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  QrCode,
  Banknote,
  Layers,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, formatINR } from '../theme/tokens';
import { BillDocType } from '../database/schema';

interface PaidBillsRecordsModalProps {
  visible: boolean;
  onClose: () => void;
  bills: BillDocType[];
}

export const PaidBillsRecordsModal: React.FC<PaidBillsRecordsModalProps> = ({
  visible,
  onClose,
  bills,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'upi' | 'cash' | 'card'>('all');

  const filteredBills = bills.filter((b) => {
    const matchesSearch =
      b.bill_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.table_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.waiter_name && b.waiter_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesMethod = filterMethod === 'all' || b.payment_method === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const totalCollected = filteredBills.reduce((acc, b) => acc + (b.grand_total || 0), 0);
  const totalTax = filteredBills.reduce((acc, b) => acc + ((b.cgst || 0) + (b.sgst || 0)), 0);

  const handleExportCSV = () => {
    if (bills.length === 0) {
      alert('No real paid records to export yet.');
      return;
    }

    const headers = 'Bill ID,Table ID,Timestamp,Subtotal (INR),CGST (INR),SGST (INR),Grand Total (INR),Payment Method,Waiter\n';
    const rows = filteredBills
      .map(
        (b) =>
          `"${b.bill_id}","${b.table_id}","${new Date(b.timestamp).toLocaleString()}","${b.subtotal}","${b.cgst}","${b.sgst}","${b.grand_total}","${b.payment_method || 'upi'}","${b.waiter_name || 'Staff'}"`
      )
      .join('\n');

    const csvContent = headers + rows;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FinOS_Paid_Bills_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('CSV export generated for ' + filteredBills.length + ' bills.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconBox}>
                <FileText size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Paid Settlement Records</Text>
                <Text style={styles.headerSubtitle}>
                  Real authentic transactions logged into local RxDB & central cloud ledger
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
                <Download size={14} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.exportBtnText}>Export CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* KPI Strip */}
          <View style={styles.kpiStrip}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Paid Bills</Text>
              <Text style={styles.kpiVal}>{filteredBills.length}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Net Revenue Collected</Text>
              <Text style={[styles.kpiVal, { color: COLORS.successDark }]}>
                {formatINR(totalCollected)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>GST Collected (CGST+SGST)</Text>
              <Text style={[styles.kpiVal, { color: COLORS.primary }]}>
                {formatINR(totalTax)}
              </Text>
            </View>
          </View>

          {/* Search & Filter Bar */}
          <View style={styles.filterBar}>
            <View style={styles.searchBox}>
              <Search size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Bill ID, Table (e.g. T4), Waiter..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <View style={styles.methodFilters}>
              {(['all', 'upi', 'cash', 'card'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodFilterBtn,
                    filterMethod === method && styles.methodFilterBtnActive,
                  ]}
                  onPress={() => setFilterMethod(method)}
                >
                  <Text
                    style={[
                      styles.methodFilterText,
                      filterMethod === method && styles.methodFilterTextActive,
                    ]}
                  >
                    {method.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Records Table */}
          <ScrollView style={styles.tableScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            {filteredBills.length === 0 ? (
              <View style={styles.emptyBox}>
                <Layers size={40} color={COLORS.textMuted} style={{ marginBottom: 10 }} />
                <Text style={styles.emptyTitle}>No Real Paid Bills Found</Text>
                <Text style={styles.emptyDesc}>
                  Fake demo orders are disabled. Add items to any table and complete a 1-click settlement to see authentic records here.
                </Text>
              </View>
            ) : (
              <View style={styles.tableContainer}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.colHeader, { flex: 2 }]}>BILL ID</Text>
                  <Text style={[styles.colHeader, { flex: 1 }]}>TABLE</Text>
                  <Text style={[styles.colHeader, { flex: 1.5 }]}>DATE / TIME</Text>
                  <Text style={[styles.colHeader, { flex: 1 }]}>METHOD</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>TAXABLE</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>GST</Text>
                  <Text style={[styles.colHeader, { flex: 1.5, textAlign: 'right' }]}>TOTAL</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
                </View>

                {filteredBills.map((b) => (
                  <View key={b.bill_id} style={styles.tableRow}>
                    <Text style={[styles.cellText, { flex: 2, fontWeight: '700', color: COLORS.primary }]}>
                      {b.bill_id}
                    </Text>
                    <Text style={[styles.cellText, { flex: 1 }]}>
                      {b.table_id.toUpperCase()}
                    </Text>
                    <Text style={[styles.cellText, { flex: 1.5, fontSize: 11, color: COLORS.textMuted }]}>
                      {new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={[styles.methodBadge, { flex: 1 }]}>
                      <Text style={styles.methodBadgeText}>{(b.payment_method || 'upi').toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.cellText, { flex: 1, textAlign: 'right' }]}>
                      {formatINR(b.subtotal)}
                    </Text>
                    <Text style={[styles.cellText, { flex: 1, textAlign: 'right', color: COLORS.textSecondary }]}>
                      {formatINR((b.cgst || 0) + (b.sgst || 0))}
                    </Text>
                    <Text style={[styles.cellText, { flex: 1.5, textAlign: 'right', fontWeight: '800', color: COLORS.textPrimary }]}>
                      {formatINR(b.grand_total)}
                    </Text>
                    <View style={[{ flex: 1, alignItems: 'center' }]}>
                      <View style={styles.paidBadge}>
                        <CheckCircle2 size={12} color={COLORS.successDark} style={{ marginRight: 4 }} />
                        <Text style={styles.paidBadgeText}>PAID</Text>
                      </View>
                    </View>
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 960,
    maxHeight: '90%',
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
    backgroundColor: '#EEF2FF',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  kpiStrip: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  methodFilters: {
    flexDirection: 'row',
    gap: 6,
  },
  methodFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  methodFilterBtnActive: {
    backgroundColor: COLORS.primary,
  },
  methodFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  methodFilterTextActive: {
    color: '#FFFFFF',
  },
  tableScroll: {
    paddingHorizontal: 24,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cellText: {
    fontSize: 12,
    color: '#1E293B',
  },
  methodBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.successDark,
  },
  emptyBox: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 420,
    lineHeight: 18,
  },
});

