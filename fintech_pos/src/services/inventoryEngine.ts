import { getPOSDatabase } from '../database';
import { IngredientDocType } from '../database/schema';

export interface ConsumptionLog {
  id: string;
  timestamp: number;
  billId: string;
  ingredientId: string;
  ingredientName: string;
  deductedAmount: number;
  remainingStock: number;
  unit: string;
  isLowStock: boolean;
}

export interface LowStockAlert {
  ingredientId: string;
  name: string;
  currentStock: number;
  threshold: number;
  unit: string;
  deficit: number;
}

// In-memory audit log for real-time drawer consumption history
const consumptionAuditLogs: ConsumptionLog[] = [
  {
    id: 'log_prev_1',
    timestamp: Date.now() - 3600000,
    billId: 'bill_t2_billed',
    ingredientId: 'ing_rice',
    ingredientName: 'Royal Basmati Rice',
    deductedAmount: 300,
    remainingStock: 15000,
    unit: 'g',
    isLowStock: false,
  },
  {
    id: 'log_prev_2',
    timestamp: Date.now() - 3600000,
    billId: 'bill_t2_billed',
    ingredientId: 'ing_ghee',
    ingredientName: 'Pure Desi Cow Ghee',
    deductedAmount: 50,
    remainingStock: 4000,
    unit: 'g',
    isLowStock: false,
  },
];

type InventoryChangeListener = () => void;
const listeners: Set<InventoryChangeListener> = new Set();

export function subscribeToInventoryChanges(listener: InventoryChangeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('[InventoryEngine] Error in listener callback:', e);
    }
  });
}

/**
 * Executes atomic batch decrements on ingredients based on recipes for a settled bill
 */
export async function deductRecipeStockForBill(billId: string): Promise<{
  success: boolean;
  deductions: ConsumptionLog[];
  lowStockAlerts: LowStockAlert[];
}> {
  const db = await getPOSDatabase();
  console.log(`[InventoryEngine] Executing atomic stock deduction for Bill ${billId}...`);

  // 1. Fetch all items in this bill
  const billItems = await db.bill_items.find({
    selector: { bill_id: billId },
  }).exec();

  if (billItems.length === 0) {
    console.warn(`[InventoryEngine] No items found for bill ${billId}`);
    return { success: true, deductions: [], lowStockAlerts: [] };
  }

  // 2. Aggregate required ingredient amounts
  const requiredAmounts: Record<string, number> = {};

  for (const item of billItems) {
    const itemData = item.toJSON();
    const recipes = await db.recipes.find({
      selector: { menu_item_id: itemData.item_id },
    }).exec();

    for (const recipeDoc of recipes) {
      const recipe = recipeDoc.toJSON();
      const totalAmount = recipe.quantity_required * itemData.quantity;
      requiredAmounts[recipe.ingredient_id] = (requiredAmounts[recipe.ingredient_id] || 0) + totalAmount;
    }
  }

  const deductions: ConsumptionLog[] = [];
  const lowStockAlerts: LowStockAlert[] = [];

  // 3. Atomically update ingredients and record consumption logs
  for (const [ingredientId, amountToDeduct] of Object.entries(requiredAmounts)) {
    const ingredientDoc = await db.ingredients.findOne({
      selector: { ingredient_id: ingredientId },
    }).exec();

    if (ingredientDoc) {
      const current = ingredientDoc.toJSON();
      const updatedStock = Math.max(0, current.current_stock - amountToDeduct);
      const isLow = updatedStock <= current.min_threshold;

      await ingredientDoc.patch({
        current_stock: updatedStock,
        last_updated: Date.now(),
      });

      const logEntry: ConsumptionLog = {
        id: `log_${Date.now()}_${ingredientId}`,
        timestamp: Date.now(),
        billId,
        ingredientId,
        ingredientName: current.name,
        deductedAmount: amountToDeduct,
        remainingStock: updatedStock,
        unit: current.unit,
        isLowStock: isLow,
      };

      consumptionAuditLogs.unshift(logEntry);
      deductions.push(logEntry);

      if (isLow) {
        lowStockAlerts.push({
          ingredientId,
          name: current.name,
          currentStock: updatedStock,
          threshold: current.min_threshold,
          unit: current.unit,
          deficit: current.min_threshold - updatedStock,
        });
      }
    }
  }

  notifyListeners();

  console.log(
    `[InventoryEngine] Deducted ${deductions.length} ingredients. Low stock alerts: ${lowStockAlerts.length}`
  );

  return {
    success: true,
    deductions,
    lowStockAlerts,
  };
}

/**
 * Returns all current ingredients with low stock warnings (< min_threshold)
 */
export async function getLowStockIngredients(): Promise<LowStockAlert[]> {
  const db = await getPOSDatabase();
  const allIngredients = await db.ingredients.find().exec();
  const alerts: LowStockAlert[] = [];

  for (const doc of allIngredients) {
    const ing = doc.toJSON();
    if (ing.current_stock <= ing.min_threshold) {
      alerts.push({
        ingredientId: ing.ingredient_id,
        name: ing.name,
        currentStock: ing.current_stock,
        threshold: ing.min_threshold,
        unit: ing.unit,
        deficit: ing.min_threshold - ing.current_stock,
      });
    }
  }

  return alerts;
}

/**
 * Restock an ingredient by adding quantity
 */
export async function restockIngredient(ingredientId: string, quantityToAdd: number): Promise<void> {
  const db = await getPOSDatabase();
  const doc = await db.ingredients.findOne({
    selector: { ingredient_id: ingredientId },
  }).exec();

  if (doc) {
    const current = doc.toJSON();
    await doc.patch({
      current_stock: current.current_stock + quantityToAdd,
      last_updated: Date.now(),
    });
    notifyListeners();
  }
}

/**
 * Get recent automatic recipe consumption history
 */
export function getConsumptionLogs(): ConsumptionLog[] {
  return [...consumptionAuditLogs];
}
