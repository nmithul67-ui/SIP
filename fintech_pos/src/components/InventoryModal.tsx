import React, { useState, useEffect } from 'react';
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
  Layers,
  AlertTriangle,
  History,
  PlusCircle,
  PackageCheck,
  RefreshCw,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme/tokens';
import { getPOSDatabase } from '../database';
import { IngredientDocType } from '../database/schema';
import {
  getConsumptionLogs,
  restockIngredient,
  subscribeToInventoryChanges,
  ConsumptionLog,
} from '../services/inventoryEngine';

interface InventoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  visible,
  onClose,
}) => {
  const [tab, setTab] = useState<'stock' | 'logs'>('stock');
  const [ingredients, setIngredients] = useState<IngredientDocType[]>([]);
  const [logs, setLogs] = useState<ConsumptionLog[]>([]);

  const loadData = async () => {
    try {
      const db = await getPOSDatabase();
      const docs = await db.ingredients.find().exec();
      setIngredients(docs.map((d) => d.toJSON()));
      setLogs(getConsumptionLogs());
    } catch (e) {
      console.error('Error loading inventory:', e);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
      const unsubscribe = subscribeToInventoryChanges(loadData);
      return unsubscribe;
    }
  }, [visible]);

  const handleQuickRestock = async (ing: IngredientDocType) => {
    const addAmount = ing.unit === 'g' || ing.unit === 'ml' ? 2000 : 20;
    await restockIngredient(ing.ingredient_id, addAmount);
    await loadData();
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
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Layers size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  Recipe-Level Live Inventory Engine
                </Text>
                <Text style={styles.headerSubtitle}>
                  Phase 2 Automated Ingredient Deduction & Threshold Alerts
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs: [ Live Ingredient Levels ] | [ Consumption Logs ] */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabButton, tab === 'stock' && styles.tabButtonActive]}
              onPress={() => setTab('stock')}
            >
              <PackageCheck
                size={16}
                color={tab === 'stock' ? COLORS.primary : COLORS.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  tab === 'stock' && styles.tabButtonTextActive,
                ]}
              >
                Live Stock Levels ({ingredients.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, tab === 'logs' && styles.tabButtonActive]}
              onPress={() => setTab('logs')}
            >
              <History
                size={16}
                color={tab === 'logs' ? COLORS.primary : COLORS.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  tab === 'logs' && styles.tabButtonTextActive,
                ]}
              >
                Auto-Deduction Audit Trail ({logs.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <View style={styles.body}>
            {tab === 'stock' ? (
              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.grid}>
                  {ingredients.map((ing) => {
                    const isLow = ing.current_stock <= ing.min_threshold;
                    const stockRatio = Math.min(1, ing.current_stock / (ing.min_threshold * 3));

                    return (
                      <View
                        key={ing.ingredient_id}
                        style={[
                          styles.ingredientCard,
                          isLow && styles.ingredientCardLowStock,
                        ]}
                      >
                        <View style={styles.ingredientTop}>
                          <Text style={styles.ingredientName}>{ing.name}</Text>
                          {isLow ? (
                            <View style={styles.lowStockPill}>
                              <AlertTriangle size={11} color={COLORS.warningText} style={{ marginRight: 3 }} />
                              <Text style={styles.lowStockPillText}>LOW STOCK</Text>
                            </View>
                          ) : (
                            <View style={styles.healthyPill}>
                              <Text style={styles.healthyPillText}>HEALTHY</Text>
                            </View>
                          )}
                        </View>

                        {/* Stock amount & Unit */}
                        <View style={styles.stockNumbersRow}>
                          <Text
                            style={[
                              styles.currentStockNumber,
                              isLow && styles.currentStockNumberLow,
                            ]}
                          >
                            {ing.current_stock.toLocaleString()}{' '}
                            <Text style={styles.unitText}>{ing.unit}</Text>
                          </Text>
                          <Text style={styles.thresholdText}>
                            Min: {ing.min_threshold} {ing.unit}
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.max(5, Math.round(stockRatio * 100))}%`,
                                backgroundColor: isLow ? COLORS.warning : COLORS.success,
                              },
                            ]}
                          />
                        </View>

                        {/* Restock trigger */}
                        <TouchableOpacity
                          style={styles.restockButton}
                          onPress={() => handleQuickRestock(ing)}
                          activeOpacity={0.7}
                        >
                          <PlusCircle size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.restockButtonText}>Quick Restock (+2k)</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {logs.length === 0 ? (
                  <View style={styles.emptyLogs}>
                    <Text style={styles.emptyLogsText}>
                      No automatic deductions recorded yet. Settle a bill to trigger atomic deductions!
                    </Text>
                  </View>
                ) : (
                  logs.map((log) => {
                    const logDate = new Date(log.timestamp);
                    const timeStr = logDate.toLocaleTimeString();

                    return (
                      <View key={log.id} style={styles.logItem}>
                        <View style={styles.logLeft}>
                          <Text style={styles.logIngredient}>{log.ingredientName}</Text>
                          <Text style={styles.logMeta}>
                            Ref Bill: {log.billId} • {timeStr}
                          </Text>
                        </View>
                        <View style={styles.logRight}>
                          <Text style={styles.logDeduction}>
                            -{log.deductedAmount} {log.unit}
                          </Text>
                          <Text style={styles.logRemaining}>
                            Remaining: {log.remainingStock} {log.unit}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '85%',
    maxHeight: '85%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
  },
  closeButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSubtle,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textMuted,
  },
  tabButtonTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.canvas,
  },
  scrollContent: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ingredientCard: {
    width: '32%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  ingredientCardLowStock: {
    borderColor: COLORS.warning,
    backgroundColor: '#FFFDF5',
  },
  ingredientTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  lowStockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowStockPillText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.warningText,
  },
  healthyPill: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  healthyPillText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.successText,
  },
  stockNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
  },
  currentStockNumber: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textPrimary,
  },
  currentStockNumberLow: {
    color: COLORS.warningDark,
  },
  unitText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.base,
    color: COLORS.textMuted,
  },
  thresholdText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  restockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  restockButtonText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  emptyLogs: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLogsText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  logItem: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logLeft: {
    flex: 1,
  },
  logIngredient: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  logMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
  },
  logDeduction: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.danger,
  },
  logRemaining: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
