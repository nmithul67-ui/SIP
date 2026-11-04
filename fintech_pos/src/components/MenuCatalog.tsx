import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Search,
  X,
  Plus,
  Flame,
  Sparkles,
  Tag,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, formatINR } from '../theme/tokens';
import { MenuItemDocType } from '../database/schema';

interface MenuCatalogProps {
  items: MenuItemDocType[];
  activeCategory: string;
  cartItemCounts: Record<string, number>;
  onAddItem: (item: MenuItemDocType) => void;
}

export const MenuCatalog: React.FC<MenuCatalogProps> = ({
  items,
  activeCategory,
  cartItemCounts,
  onAddItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items by category & search term
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        activeCategory === 'All' || item.category === activeCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.short_code && item.short_code.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchQuery]);

  return (
    <View style={styles.container}>
      {/* 1. SEARCH BAR WITH (F1) KEY SHORTCUT HINT */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items by name or code... (F1)"
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={styles.shortcutPill}>
              <Text style={styles.shortcutText}>F1</Text>
            </View>
          )}
        </View>

        {/* Quick count indicator */}
        <View style={styles.resultCountBadge}>
          <Text style={styles.resultCountText}>
            {filteredItems.length} items
          </Text>
        </View>
      </View>

      {/* 2. MENU ITEM CARDS GRID */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredItems.map((item) => {
          const countInCart = cartItemCounts[item.item_id] || 0;
          const isTax18 = item.tax_rate === 18;

          return (
            <TouchableOpacity
              key={item.item_id}
              style={[
                styles.itemCard,
                countInCart > 0 && styles.itemCardActiveInCart,
              ]}
              onPress={() => onAddItem(item)}
              activeOpacity={0.7}
            >
              {/* Top Row: Short Code & GST Tax Badge */}
              <View style={styles.itemTopRow}>
                {item.short_code ? (
                  <Text style={styles.shortCodeText}>{item.short_code}</Text>
                ) : (
                  <View />
                )}
                <View
                  style={[
                    styles.gstBadge,
                    isTax18 ? styles.gstBadge18 : styles.gstBadge5,
                  ]}
                >
                  <Text
                    style={[
                      styles.gstBadgeText,
                      isTax18 ? styles.gstBadgeText18 : styles.gstBadgeText5,
                    ]}
                  >
                    GST {item.tax_rate}%
                  </Text>
                </View>
              </View>

              {/* Item Title & Category */}
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.description ? (
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>

              {/* Bottom Row: Formatted Price & Direct Add Stepper / Counter */}
              <View style={styles.itemBottomRow}>
                <View>
                  <Text style={styles.priceLabel}>Price</Text>
                  <Text style={styles.itemPrice}>
                    {formatINR(item.price)}
                  </Text>
                </View>

                {countInCart > 0 ? (
                  <View style={styles.counterBadgeActive}>
                    <Text style={styles.counterBadgeText}>× {countInCart}</Text>
                    <View style={styles.miniPlusButton}>
                      <Plus size={12} color={COLORS.textInverse} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.addButtonDefault}>
                    <Plus size={16} color={COLORS.primary} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredItems.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateTitle}>No menu items found</Text>
            <Text style={styles.emptyStateSubtitle}>
              Try searching for something else or switch category
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
    flexDirection: 'column',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    height: 42,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm + 1,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  shortcutPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shortcutText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textSecondary,
  },
  resultCountBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultCountText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  scrollArea: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.sm,
    gap: 8,
  },
  itemCard: {
    width: '48.8%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: 124,
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  itemCardActiveInCart: {
    borderColor: COLORS.primary,
    backgroundColor: '#FAFBFD',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shortCodeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  gstBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gstBadge5: {
    backgroundColor: '#EFF6FF',
  },
  gstBadge18: {
    backgroundColor: '#FAF5FF',
  },
  gstBadgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  gstBadgeText5: {
    color: '#1D4ED8',
  },
  gstBadgeText18: {
    color: '#7E22CE',
  },
  itemBody: {
    flex: 1,
    marginVertical: 4,
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  itemDescription: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 14,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceSubtle,
  },
  priceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  itemPrice: {
    fontSize: TYPOGRAPHY.fontSize.md + 1,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textPrimary,
  },
  addButtonDefault: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  counterBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  counterBadgeText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: COLORS.textInverse,
  },
  miniPlusButton: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textSecondary,
  },
  emptyStateSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
