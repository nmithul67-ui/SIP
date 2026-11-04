import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  UtensilsCrossed,
  ShoppingBag,
  Users,
  Timer,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Cake,
  Flame,
  LayoutGrid,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, formatINR } from '../theme/tokens';
import { TableDocType, TableStatus } from '../database/schema';

export const CATEGORIES = [
  { id: 'All', label: 'All Items', icon: LayoutGrid },
  { id: 'Biryani', label: 'Biryani', icon: Flame },
  { id: 'South Indian', label: 'South Indian', icon: UtensilsCrossed },
  { id: 'Bakery', label: 'Bakery', icon: Cake },
  { id: 'Beverages', label: 'Beverages', icon: Coffee },
];

interface TableSelectorProps {
  tables: TableDocType[];
  activeTableId: string;
  onSelectTable: (tableId: string) => void;
  workspaceMode: 'dine-in' | 'takeaway';
  onSwitchWorkspace: (mode: 'dine-in' | 'takeaway') => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  tableBalances: Record<string, number>;
}

export const TableSelector: React.FC<TableSelectorProps> = ({
  tables,
  activeTableId,
  onSelectTable,
  workspaceMode,
  onSwitchWorkspace,
  activeCategory,
  onSelectCategory,
  tableBalances,
}) => {
  // Format elapsed seated time
  const getElapsedMinutes = (seatedTime?: number | null): string => {
    if (!seatedTime) return '--';
    const elapsedMinutes = Math.floor((Date.now() - seatedTime) / (1000 * 60));
    if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
    const hours = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'occupied':
        return {
          bg: COLORS.primaryLight,
          text: COLORS.primary,
          dot: COLORS.primary,
        };
      case 'billed':
        return {
          bg: COLORS.warningLight,
          text: COLORS.warningText,
          dot: COLORS.warning,
        };
      case 'vacant':
      default:
        return {
          bg: COLORS.successLight,
          text: COLORS.successText,
          dot: COLORS.success,
        };
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. WORKSPACE SWITCHER TABS */}
      <View style={styles.workspaceSwitchContainer}>
        <TouchableOpacity
          style={[
            styles.workspaceTab,
            workspaceMode === 'dine-in' && styles.workspaceTabActive,
          ]}
          onPress={() => onSwitchWorkspace('dine-in')}
          activeOpacity={0.8}
        >
          <UtensilsCrossed
            size={16}
            color={workspaceMode === 'dine-in' ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.workspaceTabText,
              workspaceMode === 'dine-in' && styles.workspaceTabTextActive,
            ]}
          >
            Dine-In Tables
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.workspaceTab,
            workspaceMode === 'takeaway' && styles.workspaceTabActive,
          ]}
          onPress={() => onSwitchWorkspace('takeaway')}
          activeOpacity={0.8}
        >
          <ShoppingBag
            size={16}
            color={workspaceMode === 'takeaway' ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.workspaceTabText,
              workspaceMode === 'takeaway' && styles.workspaceTabTextActive,
            ]}
          >
            Takeaway / QSR
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. 12 TABLE CARDS GRID */}
      <View style={styles.tablesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Floor Layout (12 Tables)</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.legendText}>Vacant</Text>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>Occ</Text>
            <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.legendText}>Billed</Text>
          </View>
        </View>

        <ScrollView
          style={styles.tableScroll}
          contentContainerStyle={styles.tableGrid}
          showsVerticalScrollIndicator={false}
        >
          {tables.map((table) => {
            const isSelected = activeTableId === table.table_id;
            const statusConfig = getStatusColor(table.status);
            const balance = tableBalances[table.table_id] || 0;
            const seatedStr = getElapsedMinutes(table.seated_time);

            return (
              <TouchableOpacity
                key={table.table_id}
                style={[
                  styles.tableCard,
                  isSelected && styles.tableCardSelected,
                ]}
                onPress={() => onSelectTable(table.table_id)}
                activeOpacity={0.7}
              >
                {/* Table Header: ID & Status Pill */}
                <View style={styles.tableCardHeader}>
                  <Text
                    style={[
                      styles.tableLabel,
                      isSelected && styles.tableLabelSelected,
                    ]}
                  >
                    {table.label}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusConfig.bg },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusSmallDot,
                        { backgroundColor: statusConfig.dot },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: statusConfig.text },
                      ]}
                    >
                      {table.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Table Details: Seated Time & Waiter */}
                <View style={styles.tableMetaRow}>
                  <View style={styles.metaItem}>
                    <Timer size={12} color={isSelected ? '#BFDBFE' : COLORS.textMuted} />
                    <Text
                      style={[
                        styles.metaText,
                        isSelected && styles.metaTextSelected,
                      ]}
                    >
                      {seatedStr}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Users size={12} color={isSelected ? '#BFDBFE' : COLORS.textMuted} />
                    <Text
                      style={[
                        styles.metaText,
                        isSelected && styles.metaTextSelected,
                      ]}
                    >
                      {table.guest_count || 2}p
                    </Text>
                  </View>
                </View>

                {/* Table Active Balance (Monospace tabular-nums) */}
                <View style={styles.balanceRow}>
                  <Text
                    style={[
                      styles.balanceAmount,
                      isSelected && styles.balanceAmountSelected,
                      balance === 0 && !isSelected && styles.balanceEmpty,
                    ]}
                  >
                    {balance > 0 ? formatINR(balance) : '₹0.00'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. CATEGORY FILTER PILLS (Thumb-friendly below table grid) */}
      <View style={styles.categorySection}>
        <Text style={styles.categorySectionTitle}>Categories (F3 to switch)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsContainer}
        >
          {CATEGORIES.map((cat) => {
            const isCatSelected = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  isCatSelected && styles.categoryPillSelected,
                ]}
                onPress={() => onSelectCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Icon
                  size={15}
                  color={isCatSelected ? COLORS.textInverse : COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    isCatSelected && styles.categoryPillTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  workspaceSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 3,
    margin: SPACING.sm,
    borderRadius: 8,
  },
  workspaceTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    minHeight: 40,
  },
  workspaceTabActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  workspaceTabText: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textMuted,
  },
  workspaceTabTextActive: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  tablesSection: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  tableScroll: {
    flex: 1,
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
    paddingBottom: 8,
  },
  tableCard: {
    width: '48.5%',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 8,
    minHeight: 80,
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  tableCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.md,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableLabel: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textPrimary,
  },
  tableLabelSelected: {
    color: COLORS.textInverse,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusSmallDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 0.2,
  },
  tableMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
  },
  metaTextSelected: {
    color: '#E0E7FF',
  },
  balanceRow: {
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 3,
  },
  balanceAmount: {
    fontSize: TYPOGRAPHY.fontSize.sm + 1,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  balanceAmountSelected: {
    color: '#FEF08A', // Soft yellow contrast for active table
  },
  balanceEmpty: {
    color: COLORS.textSubtle,
    fontWeight: TYPOGRAPHY.fontWeight.normal,
  },
  categorySection: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
  },
  categorySectionTitle: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  categoryPillsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 38,
  },
  categoryPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  categoryPillText: {
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
  },
  categoryPillTextSelected: {
    color: COLORS.textInverse,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
