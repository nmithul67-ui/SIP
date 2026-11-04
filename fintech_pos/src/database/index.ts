import {
  createRxDatabase,
  RxDatabase,
  RxCollection,
  addRxPlugin,
} from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { Platform } from 'react-native';
import {
  BusinessDocType,
  TableDocType,
  MenuItemDocType,
  IngredientDocType,
  RecipeDocType,
  BillDocType,
  BillItemDocType,
  businessSchema,
  tableSchema,
  menuItemSchema,
  ingredientSchema,
  recipeSchema,
  billSchema,
  billItemSchema,
} from './schema';
import {
  SEED_BUSINESS,
  SEED_TABLES,
  SEED_MENU_ITEMS,
  SEED_INGREDIENTS,
  SEED_RECIPES,
  SEED_INITIAL_BILL,
  SEED_INITIAL_BILL_ITEMS,
} from './seed';

// Collection Types
export type BusinessCollection = RxCollection<BusinessDocType>;
export type TableCollection = RxCollection<TableDocType>;
export type MenuItemCollection = RxCollection<MenuItemDocType>;
export type IngredientCollection = RxCollection<IngredientDocType>;
export type RecipeCollection = RxCollection<RecipeDocType>;
export type BillCollection = RxCollection<BillDocType>;
export type BillItemCollection = RxCollection<BillItemDocType>;

export interface POSDatabaseCollections {
  business: BusinessCollection;
  tables: TableCollection;
  menu_items: MenuItemCollection;
  ingredients: IngredientCollection;
  recipes: RecipeCollection;
  bills: BillCollection;
  bill_items: BillItemCollection;
}

export type POSDatabase = RxDatabase<POSDatabaseCollections>;

let dbPromise: Promise<POSDatabase> | null = null;
let databaseInstance: POSDatabase | null = null;

/**
 * Resolves the appropriate RxStorage engine:
 * Supports Dexie (IndexedDB) for web/browser persistent storage across reloads,
 * and high-performance in-memory fallback for test harnesses or native environments.
 */
async function getStorageEngine() {
  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      const { getRxStorageDexie } = await import('rxdb/plugins/storage-dexie');
      return getRxStorageDexie();
    }
  } catch (err) {
    console.warn('[RxDB] Dexie storage initialization fallback to memory storage:', err);
  }
  return getRxStorageMemory();
}

/**
 * Initialize or get the singleton RxDB database instance
 */
export async function getPOSDatabase(): Promise<POSDatabase> {
  if (databaseInstance) {
    return databaseInstance;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const storage = await getStorageEngine();

        const db: POSDatabase = await createRxDatabase<POSDatabaseCollections>({
          name: 'resilient_pos_fnb',
          storage,
          ignoreDuplicate: true,
          multiInstance: false,
        });

        // Register all 7 collections
        await db.addCollections({
          business: { schema: businessSchema },
          tables: { schema: tableSchema },
          menu_items: { schema: menuItemSchema },
          ingredients: { schema: ingredientSchema },
          recipes: { schema: recipeSchema },
          bills: { schema: billSchema },
          bill_items: { schema: billItemSchema },
        });

        // Seed initial enterprise dataset if empty
        await seedDatabaseIfEmpty(db);

        databaseInstance = db;
        return db;
      } catch (err) {
        console.error('[RxDB] Error initializing database:', err);
        throw err;
      }
    })();
  }

  return dbPromise;
}

/**
 * Seeds tables, menu, ingredients, recipes, and default active table order
 */
async function seedDatabaseIfEmpty(db: POSDatabase) {
  const existingBiz = await db.business.findOne().exec();
  if (!existingBiz) {
    console.log('[RxDB] Seeding enterprise dataset...');

    // 1. Business
    await db.business.insert(SEED_BUSINESS);

    // 2. Tables
    await db.tables.bulkInsert(SEED_TABLES);

    // 3. Menu items
    await db.menu_items.bulkInsert(SEED_MENU_ITEMS);

    // 4. Ingredients
    await db.ingredients.bulkInsert(SEED_INGREDIENTS);

    // 5. Recipes
    await db.recipes.bulkInsert(SEED_RECIPES);

    // No fake initial bills seeded - only real orders stored

    console.log('[RxDB] Seeding completed successfully. Local database ready.');
  }
}
