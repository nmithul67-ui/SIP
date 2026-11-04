import { RxJsonSchema } from 'rxdb';

// -------------------------------------------------------------
// 1. BUSINESS SCHEMA & TYPES
// -------------------------------------------------------------
export interface BusinessDocType {
  business_id: string;
  name: string;
  gstin: string;
  type: 'restaurant' | 'bakery';
}

export const businessSchema: RxJsonSchema<BusinessDocType> = {
  title: 'business schema',
  version: 0,
  primaryKey: 'business_id',
  type: 'object',
  properties: {
    business_id: {
      type: 'string',
      maxLength: 64,
    },
    name: {
      type: 'string',
    },
    gstin: {
      type: 'string',
      maxLength: 20,
    },
    type: {
      type: 'string',
      enum: ['restaurant', 'bakery'],
    },
  },
  required: ['business_id', 'name', 'gstin', 'type'],
};

// -------------------------------------------------------------
// 2. TABLES SCHEMA & TYPES
// -------------------------------------------------------------
export type TableStatus = 'vacant' | 'occupied' | 'billed';

export interface TableDocType {
  table_id: string;
  label: string;
  status: TableStatus;
  active_bill_id: string | null;
  assigned_waiter: string | null;
  seated_time?: number | null;
  guest_count?: number;
}

export const tableSchema: RxJsonSchema<TableDocType> = {
  title: 'tables schema',
  version: 0,
  primaryKey: 'table_id',
  type: 'object',
  properties: {
    table_id: {
      type: 'string',
      maxLength: 64,
    },
    label: {
      type: 'string',
      maxLength: 20,
    },
    status: {
      type: 'string',
      enum: ['vacant', 'occupied', 'billed'],
      maxLength: 16,
    },
    active_bill_id: {
      type: ['string', 'null'],
    },
    assigned_waiter: {
      type: ['string', 'null'],
    },
    seated_time: {
      type: ['number', 'null'],
    },
    guest_count: {
      type: 'number',
    },
  },
  required: ['table_id', 'label', 'status'],
  indexes: ['status'],
};

// -------------------------------------------------------------
// 3. MENU ITEMS SCHEMA & TYPES
// -------------------------------------------------------------
export interface MenuItemDocType {
  item_id: string;
  name: string;
  category: string;
  price: number;
  tax_rate: number; // e.g. 5 or 18
  is_available: boolean;
  short_code?: string;
  description?: string;
}

export const menuItemSchema: RxJsonSchema<MenuItemDocType> = {
  title: 'menu items schema',
  version: 0,
  primaryKey: 'item_id',
  type: 'object',
  properties: {
    item_id: {
      type: 'string',
      maxLength: 64,
    },
    name: {
      type: 'string',
      maxLength: 120,
    },
    category: {
      type: 'string',
      maxLength: 64,
    },
    price: {
      type: 'number',
      minimum: 0,
    },
    tax_rate: {
      type: 'number',
      enum: [0, 5, 12, 18, 28],
    },
    is_available: {
      type: 'boolean',
    },
    short_code: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
  },
  required: ['item_id', 'name', 'category', 'price', 'tax_rate', 'is_available'],
  indexes: ['category'],
};

// -------------------------------------------------------------
// 4. INGREDIENTS SCHEMA & TYPES (Phase 2 Recipe Inventory)
// -------------------------------------------------------------
export type IngredientUnit = 'g' | 'ml' | 'units';

export interface IngredientDocType {
  ingredient_id: string;
  name: string;
  current_stock: number;
  unit: IngredientUnit;
  min_threshold: number;
  last_updated?: number;
}

export const ingredientSchema: RxJsonSchema<IngredientDocType> = {
  title: 'ingredients schema',
  version: 0,
  primaryKey: 'ingredient_id',
  type: 'object',
  properties: {
    ingredient_id: {
      type: 'string',
      maxLength: 64,
    },
    name: {
      type: 'string',
      maxLength: 100,
    },
    current_stock: {
      type: 'number',
    },
    unit: {
      type: 'string',
      enum: ['g', 'ml', 'units'],
      maxLength: 10,
    },
    min_threshold: {
      type: 'number',
      minimum: 0,
    },
    last_updated: {
      type: 'number',
    },
  },
  required: ['ingredient_id', 'name', 'current_stock', 'unit', 'min_threshold'],
};

// -------------------------------------------------------------
// 5. RECIPES SCHEMA & TYPES (Bill Item to Ingredient mapping)
// -------------------------------------------------------------
export interface RecipeDocType {
  recipe_id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity_required: number;
}

export const recipeSchema: RxJsonSchema<RecipeDocType> = {
  title: 'recipes schema',
  version: 0,
  primaryKey: 'recipe_id',
  type: 'object',
  properties: {
    recipe_id: {
      type: 'string',
      maxLength: 64,
    },
    menu_item_id: {
      type: 'string',
      maxLength: 64,
    },
    ingredient_id: {
      type: 'string',
      maxLength: 64,
    },
    quantity_required: {
      type: 'number',
      minimum: 0.001,
    },
  },
  required: ['recipe_id', 'menu_item_id', 'ingredient_id', 'quantity_required'],
  indexes: ['menu_item_id', 'ingredient_id'],
};

// -------------------------------------------------------------
// 6. BILLS SCHEMA & TYPES
// -------------------------------------------------------------
export type BillStatus = 'draft' | 'kot_sent' | 'paid' | 'voided';

export interface BillDocType {
  bill_id: string;
  table_id: string;
  status: BillStatus;
  timestamp: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  grand_total: number;
  payment_method?: 'cash' | 'upi' | 'card' | 'split' | null;
  waiter_name?: string;
  kot_number?: number;
}

export const billSchema: RxJsonSchema<BillDocType> = {
  title: 'bills schema',
  version: 0,
  primaryKey: 'bill_id',
  type: 'object',
  properties: {
    bill_id: {
      type: 'string',
      maxLength: 64,
    },
    table_id: {
      type: 'string',
      maxLength: 64,
    },
    status: {
      type: 'string',
      enum: ['draft', 'kot_sent', 'paid', 'voided'],
      maxLength: 16,
    },
    timestamp: {
      type: 'number',
    },
    subtotal: {
      type: 'number',
      minimum: 0,
    },
    cgst: {
      type: 'number',
      minimum: 0,
    },
    sgst: {
      type: 'number',
      minimum: 0,
    },
    grand_total: {
      type: 'number',
      minimum: 0,
    },
    payment_method: {
      type: ['string', 'null'],
    },
    waiter_name: {
      type: 'string',
    },
    kot_number: {
      type: 'number',
    },
  },
  required: ['bill_id', 'table_id', 'status', 'timestamp', 'subtotal', 'cgst', 'sgst', 'grand_total'],
  indexes: ['table_id', 'status'],
};

// -------------------------------------------------------------
// 7. BILL ITEMS SCHEMA & TYPES
// -------------------------------------------------------------
export interface BillItemDocType {
  bill_item_id: string;
  bill_id: string;
  item_id: string;
  name: string;
  quantity: number;
  price: number;
  tax_rate: number;
  notes?: string;
}

export const billItemSchema: RxJsonSchema<BillItemDocType> = {
  title: 'bill items schema',
  version: 0,
  primaryKey: 'bill_item_id',
  type: 'object',
  properties: {
    bill_item_id: {
      type: 'string',
      maxLength: 64,
    },
    bill_id: {
      type: 'string',
      maxLength: 64,
    },
    item_id: {
      type: 'string',
      maxLength: 64,
    },
    name: {
      type: 'string',
      maxLength: 120,
    },
    quantity: {
      type: 'number',
      minimum: 1,
    },
    price: {
      type: 'number',
      minimum: 0,
    },
    tax_rate: {
      type: 'number',
    },
    notes: {
      type: 'string',
    },
  },
  required: ['bill_item_id', 'bill_id', 'item_id', 'name', 'quantity', 'price', 'tax_rate'],
  indexes: ['bill_id'],
};
