/**
 * Design Token System for Enterprise Industrial POS
 * Calibrated for 10.1" Android tablets in fixed landscape orientation (1280x800 / 1920x1200)
 */

export const COLORS = {
  // Surface & Canvas
  canvas: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  surfaceSubtle: '#F1F5F9',

  // Borders & Dividers
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
  borderLight: '#F1F5F9',

  // Primary Brand & Active Accent
  primary: '#1F497D',
  primaryDark: '#16375F',
  primaryLight: '#EBF3FB',
  primaryHover: '#2A5C9A',

  // Resilience & Local-First (Emerald)
  success: '#10B981',
  successDark: '#059669',
  successLight: '#ECFDF5',
  successText: '#065F46',

  // Stock Triggers & Warnings (Amber)
  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FFFBEB',
  warningText: '#92400E',

  // Danger & Deletion (Coral Red)
  danger: '#EF4444',
  dangerDark: '#DC2626',
  dangerLight: '#FEF2F2',
  dangerText: '#991B1B',

  // Secondary Accent & QSR
  accent: '#0EA5E9',
  accentLight: '#E0F2FE',

  // Typography Hierarchy
  textPrimary: '#0F172A',   // Slate 900
  textSecondary: '#334155', // Slate 700
  textMuted: '#64748B',     // Slate 500
  textSubtle: '#94A3B8',    // Slate 400
  textInverse: '#FFFFFF',

  // Status indicators
  tableVacant: '#10B981',
  tableOccupied: '#1F497D',
  tableBilled: '#F59E0B',
};

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  touchMin: 48, // Minimum 48x48dp touch target
};

export const TYPOGRAPHY = {
  fontFamily: {
    base: 'System',
    mono: 'monospace, Courier, Courier New',
  },
  fontSize: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    display: 28,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const SHADOWS = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const LAYOUT = {
  headerHeight: 56,
  leftPaneWidthPct: '26%' as const,
  centerPaneWidthPct: '42%' as const,
  rightPaneWidthPct: '32%' as const,
  minTouchTarget: 48,
  borderRadiusSm: 6,
  borderRadiusMd: 10,
  borderRadiusLg: 14,
};

/**
 * Format currency in Indian Rupees (INR) with tabular-nums
 */
export function formatINR(amount: number): string {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
