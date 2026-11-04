import {
  BusinessDocType,
  TableDocType,
  MenuItemDocType,
  IngredientDocType,
  RecipeDocType,
  BillDocType,
  BillItemDocType,
} from './schema';

export const SEED_BUSINESS: BusinessDocType = {
  business_id: 'biz_aura_001',
  name: 'Aura Gourmet Bistro & Bakery',
  gstin: '29ABCDE1234F1Z5',
  type: 'restaurant',
};

export const SEED_TABLES: TableDocType[] = [
  { table_id: 't1', label: 'T1', status: 'vacant', active_bill_id: null, assigned_waiter: 'Ramesh K.', seated_time: null, guest_count: 2 },
  { table_id: 't2', label: 'T2', status: 'vacant', active_bill_id: null, assigned_waiter: 'Vikram S.', seated_time: null, guest_count: 4 },
  { table_id: 't3', label: 'T3', status: 'vacant', active_bill_id: null, assigned_waiter: 'Ramesh K.', seated_time: null, guest_count: 2 },
  { table_id: 't4', label: 'T4', status: 'vacant', active_bill_id: null, assigned_waiter: 'Vikram S.', seated_time: null, guest_count: 3 },
  { table_id: 't5', label: 'T5', status: 'vacant', active_bill_id: null, assigned_waiter: 'Anita P.', seated_time: null, guest_count: 4 },
  { table_id: 't6', label: 'T6', status: 'vacant', active_bill_id: null, assigned_waiter: 'Anita P.', seated_time: null, guest_count: 2 },
  { table_id: 't7', label: 'T7', status: 'vacant', active_bill_id: null, assigned_waiter: 'Ramesh K.', seated_time: null, guest_count: 6 },
  { table_id: 't8', label: 'T8', status: 'vacant', active_bill_id: null, assigned_waiter: 'Vikram S.', seated_time: null, guest_count: 4 },
  { table_id: 't9', label: 'T9', status: 'vacant', active_bill_id: null, assigned_waiter: 'Anita P.', seated_time: null, guest_count: 6 },
  { table_id: 't10', label: 'T10', status: 'vacant', active_bill_id: null, assigned_waiter: 'Vikram S.', seated_time: null, guest_count: 8 },
  { table_id: 't11', label: 'T11', status: 'vacant', active_bill_id: null, assigned_waiter: 'Ramesh K.', seated_time: null, guest_count: 4 },
  { table_id: 't12', label: 'T12', status: 'vacant', active_bill_id: null, assigned_waiter: 'Anita P.', seated_time: null, guest_count: 4 },
];

export const SEED_MENU_ITEMS: MenuItemDocType[] = [
  // Biryani
  {
    item_id: 'menu_biryani_hyd',
    name: 'Hyderabadi Chicken Biryani',
    category: 'Biryani',
    price: 340,
    tax_rate: 5,
    is_available: true,
    short_code: 'HYD-B',
    description: 'Slow-cooked fragrant basmati rice with marinated chicken & caramelized onions',
  },
  {
    item_id: 'menu_biryani_paneer',
    name: 'Paneer Tikka Dum Biryani',
    category: 'Biryani',
    price: 290,
    tax_rate: 5,
    is_available: true,
    short_code: 'PAN-B',
    description: 'Char-grilled cottage cheese cubes layered with long-grain saffron basmati',
  },
  {
    item_id: 'menu_biryani_awadhi',
    name: 'Awadhi Mutton Dum Biryani',
    category: 'Biryani',
    price: 450,
    tax_rate: 5,
    is_available: true,
    short_code: 'AWD-B',
    description: 'Lucknowi royal preparation with tender mutton and aromatic mace-cardamom spices',
  },
  {
    item_id: 'menu_biryani_egg',
    name: 'Classic Egg Dum Biryani',
    category: 'Biryani',
    price: 260,
    tax_rate: 5,
    is_available: true,
    short_code: 'EGG-B',
    description: 'Spiced hard-boiled eggs nested in saffron-scented dum rice',
  },

  // South Indian
  {
    item_id: 'menu_south_ghee_dosa',
    name: 'Ghee Roast Masala Dosa',
    category: 'South Indian',
    price: 140,
    tax_rate: 5,
    is_available: true,
    short_code: 'GHEE-D',
    description: 'Crisp golden crepe roasted in pure desi ghee with spiced potato mash',
  },
  {
    item_id: 'menu_south_thatte_idli',
    name: 'Thatte Idli with Medu Vada',
    category: 'South Indian',
    price: 110,
    tax_rate: 5,
    is_available: true,
    short_code: 'IDL-V',
    description: 'Steamed plate idli topped with gunpowder butter & crispy vada',
  },
  {
    item_id: 'menu_south_parotta',
    name: 'Malabar Parotta with Veg Kurma',
    category: 'South Indian',
    price: 160,
    tax_rate: 5,
    is_available: true,
    short_code: 'PAR-K',
    description: 'Flaky layered Kerala parottas paired with coconut-rich vegetable gravy',
  },
  {
    item_id: 'menu_south_coffee',
    name: 'South Indian Degree Filter Coffee',
    category: 'South Indian',
    price: 60,
    tax_rate: 5,
    is_available: true,
    short_code: 'DEG-C',
    description: 'Fresh decoction brewed with chickory blend, served in traditional brass davarah',
  },

  // Bakery
  {
    item_id: 'menu_bakery_croissant',
    name: 'Belgian Dark Chocolate Croissant',
    category: 'Bakery',
    price: 180,
    tax_rate: 18,
    is_available: true,
    short_code: 'CHOC-C',
    description: 'Flaky butter pastry rolled with 70% Callebaut dark chocolate batons',
  },
  {
    item_id: 'menu_bakery_garlic_bread',
    name: 'Sourdough Herb & Garlic Toast',
    category: 'Bakery',
    price: 150,
    tax_rate: 18,
    is_available: true,
    short_code: 'GAR-T',
    description: 'Artisanal wild-yeast sourdough brushed with roasted garlic and rosemary ghee',
  },
  {
    item_id: 'menu_bakery_brownie',
    name: 'Classic Walnut Fudge Brownie',
    category: 'Bakery',
    price: 130,
    tax_rate: 18,
    is_available: true,
    short_code: 'WAL-B',
    description: 'Gooey dark cocoa brownie studded with toasted Kashmiri walnuts',
  },
  {
    item_id: 'menu_bakery_cheesecake',
    name: 'Blueberry New York Cheesecake',
    category: 'Bakery',
    price: 220,
    tax_rate: 18,
    is_available: true,
    short_code: 'BLU-C',
    description: 'Baked Philadelphia cream cheese cake topped with compote on graham base',
  },

  // Beverages
  {
    item_id: 'menu_bev_kullad_chai',
    name: 'Masala Chai in Clay Kullad',
    category: 'Beverages',
    price: 50,
    tax_rate: 5,
    is_available: true,
    short_code: 'KUL-CH',
    description: 'Ginger-cardamom infused milk tea served in an earthen clay cup',
  },
  {
    item_id: 'menu_bev_lime_soda',
    name: 'Fresh Lime Soda (Sweet & Salt)',
    category: 'Beverages',
    price: 80,
    tax_rate: 12,
    is_available: true,
    short_code: 'LIME-S',
    description: 'Crushed key lime, black salt, and bubbling carbonated soda',
  },
  {
    item_id: 'menu_bev_cold_brew',
    name: 'Cold Brew Citrus Tonic',
    category: 'Beverages',
    price: 170,
    tax_rate: 18,
    is_available: true,
    short_code: 'COLD-B',
    description: '18-hour steeped single-origin Arabica poured over artisanal tonic water',
  },
  {
    item_id: 'menu_bev_mango_lassi',
    name: 'Alphonso Mango Royal Lassi',
    category: 'Beverages',
    price: 120,
    tax_rate: 5,
    is_available: true,
    short_code: 'MNG-L',
    description: 'Thick churned creamy yogurt whipped with Ratnagiri alphonso pulp',
  },
];

export const SEED_INGREDIENTS: IngredientDocType[] = [
  { ingredient_id: 'ing_rice', name: 'Royal Basmati Rice', current_stock: 15000, unit: 'g', min_threshold: 3000, last_updated: Date.now() },
  { ingredient_id: 'ing_chicken', name: 'Fresh Dressed Chicken', current_stock: 8500, unit: 'g', min_threshold: 2500, last_updated: Date.now() },
  { ingredient_id: 'ing_mutton', name: 'Tender Cut Mutton', current_stock: 6000, unit: 'g', min_threshold: 2000, last_updated: Date.now() },
  { ingredient_id: 'ing_paneer', name: 'Farm Fresh Paneer', current_stock: 4500, unit: 'g', min_threshold: 1200, last_updated: Date.now() },
  { ingredient_id: 'ing_ghee', name: 'Pure Desi Cow Ghee', current_stock: 4000, unit: 'g', min_threshold: 1000, last_updated: Date.now() },
  { ingredient_id: 'ing_biryani_spices', name: 'Dum Biryani Spice Mix', current_stock: 2200, unit: 'g', min_threshold: 500, last_updated: Date.now() },
  { ingredient_id: 'ing_dosa_batter', name: 'Stoneground Dosa Batter', current_stock: 9000, unit: 'ml', min_threshold: 2500, last_updated: Date.now() },
  { ingredient_id: 'ing_flour', name: 'Artisan Maida / Flour', current_stock: 12000, unit: 'g', min_threshold: 3500, last_updated: Date.now() },
  { ingredient_id: 'ing_chocolate', name: 'Belgian Dark Chocolate 70%', current_stock: 1800, unit: 'g', min_threshold: 800, last_updated: Date.now() },
  { ingredient_id: 'ing_cream_cheese', name: 'Philadelphia Cream Cheese', current_stock: 1500, unit: 'g', min_threshold: 600, last_updated: Date.now() },
  { ingredient_id: 'ing_milk', name: 'Full Cream Farm Milk', current_stock: 7500, unit: 'ml', min_threshold: 2000, last_updated: Date.now() },
  { ingredient_id: 'ing_coffee_beans', name: 'Estate Arabica Coffee Beans', current_stock: 2800, unit: 'g', min_threshold: 600, last_updated: Date.now() },
  { ingredient_id: 'ing_tea_leaves', name: 'Assam CTC & Cardamom Tea', current_stock: 1800, unit: 'g', min_threshold: 400, last_updated: Date.now() },
];

export const SEED_RECIPES: RecipeDocType[] = [
  // Hyderabadi Chicken Biryani
  { recipe_id: 'rec_hyd_rice', menu_item_id: 'menu_biryani_hyd', ingredient_id: 'ing_rice', quantity_required: 150 },
  { recipe_id: 'rec_hyd_chk', menu_item_id: 'menu_biryani_hyd', ingredient_id: 'ing_chicken', quantity_required: 200 },
  { recipe_id: 'rec_hyd_ghee', menu_item_id: 'menu_biryani_hyd', ingredient_id: 'ing_ghee', quantity_required: 25 },
  { recipe_id: 'rec_hyd_spc', menu_item_id: 'menu_biryani_hyd', ingredient_id: 'ing_biryani_spices', quantity_required: 20 },

  // Paneer Tikka Biryani
  { recipe_id: 'rec_pan_rice', menu_item_id: 'menu_biryani_paneer', ingredient_id: 'ing_rice', quantity_required: 150 },
  { recipe_id: 'rec_pan_pan', menu_item_id: 'menu_biryani_paneer', ingredient_id: 'ing_paneer', quantity_required: 140 },
  { recipe_id: 'rec_pan_ghee', menu_item_id: 'menu_biryani_paneer', ingredient_id: 'ing_ghee', quantity_required: 20 },

  // Awadhi Mutton Biryani
  { recipe_id: 'rec_awd_rice', menu_item_id: 'menu_biryani_awadhi', ingredient_id: 'ing_rice', quantity_required: 160 },
  { recipe_id: 'rec_awd_mut', menu_item_id: 'menu_biryani_awadhi', ingredient_id: 'ing_mutton', quantity_required: 220 },
  { recipe_id: 'rec_awd_ghee', menu_item_id: 'menu_biryani_awadhi', ingredient_id: 'ing_ghee', quantity_required: 30 },

  // Ghee Roast Dosa
  { recipe_id: 'rec_dosa_bat', menu_item_id: 'menu_south_ghee_dosa', ingredient_id: 'ing_dosa_batter', quantity_required: 180 },
  { recipe_id: 'rec_dosa_ghee', menu_item_id: 'menu_south_ghee_dosa', ingredient_id: 'ing_ghee', quantity_required: 35 },

  // Belgian Croissant
  { recipe_id: 'rec_crs_flr', menu_item_id: 'menu_bakery_croissant', ingredient_id: 'ing_flour', quantity_required: 80 },
  { recipe_id: 'rec_crs_choc', menu_item_id: 'menu_bakery_croissant', ingredient_id: 'ing_chocolate', quantity_required: 45 },
  { recipe_id: 'rec_crs_ghee', menu_item_id: 'menu_bakery_croissant', ingredient_id: 'ing_ghee', quantity_required: 30 },

  // Cheesecake
  { recipe_id: 'rec_chk_chs', menu_item_id: 'menu_bakery_cheesecake', ingredient_id: 'ing_cream_cheese', quantity_required: 120 },
  { recipe_id: 'rec_chk_flr', menu_item_id: 'menu_bakery_cheesecake', ingredient_id: 'ing_flour', quantity_required: 40 },

  // Filter Coffee
  { recipe_id: 'rec_cof_bean', menu_item_id: 'menu_south_coffee', ingredient_id: 'ing_coffee_beans', quantity_required: 18 },
  { recipe_id: 'rec_cof_milk', menu_item_id: 'menu_south_coffee', ingredient_id: 'ing_milk', quantity_required: 120 },

  // Kullad Chai
  { recipe_id: 'rec_cha_tea', menu_item_id: 'menu_bev_kullad_chai', ingredient_id: 'ing_tea_leaves', quantity_required: 12 },
  { recipe_id: 'rec_cha_milk', menu_item_id: 'menu_bev_kullad_chai', ingredient_id: 'ing_milk', quantity_required: 100 },
];

export const SEED_INITIAL_BILL: BillDocType = {
  bill_id: 'bill_t4_active',
  table_id: 't4',
  status: 'draft',
  timestamp: Date.now() - 20 * 60 * 1000,
  subtotal: 620,
  cgst: 15.5,
  sgst: 15.5,
  grand_total: 651,
  waiter_name: 'Vikram S.',
  kot_number: 101,
};

export const SEED_INITIAL_BILL_ITEMS: BillItemDocType[] = [];
