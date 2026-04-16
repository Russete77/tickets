/**
 * Design tokens for Ticketeria Mobile app.
 * Dark theme primary with comprehensive spacing, typography, and color scales.
 */

export const Colors = {
  // Primary dark theme
  bg: '#0A0A0F',
  surface: '#12121A',
  surfaceAlt: '#1A1A24',
  border: '#2A2A34',

  // Accent and interaction
  accent: '#6C5CE7',
  accentLight: '#8B7FE8',
  accentDark: '#5A4BC4',

  // Status colors
  success: '#00C853',
  error: '#FF3D3D',
  warning: '#FFB300',
  info: '#00B8E6',

  // Semantic text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A8',
  textTertiary: '#6A6A72',
  textInverse: '#0A0A0F',

  // Background states
  bgHover: '#1A1A24',
  bgActive: '#2A2A34',
  bgDisabled: '#12121A',

  // Additional accent shades
  accentSuccess: '#26D65E',
  accentError: '#FF6B6B',
  accentWarning: '#FFD93D',

  // Overlay and transparency
  overlay: 'rgba(10, 10, 15, 0.8)',
  overlayLight: 'rgba(255, 255, 255, 0.1)',

  // Gradient base colors
  gradientStart: '#6C5CE7',
  gradientEnd: '#4A4080',
} as const;

export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 8.0,
    elevation: 12,
  },
} as const;

export const Animations = {
  duration: {
    fast: 150,
    base: 300,
    slow: 500,
  },

  timing: {
    ease: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
    easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  },
} as const;

export const Breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export const ZIndex = {
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  backdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
} as const;

// Lowercase aliases used by some screens
export const colors = {
  primary: Colors.accent,
  primaryDark: Colors.accentDark,
  primaryLight: Colors.accentLight,
  secondary: '#FF6584',
  background: Colors.bg,
  surface: Colors.surface,
  white: '#FFFFFF',
  black: '#000000',
  text: Colors.textPrimary,
  textSecondary: Colors.textSecondary,
  textTertiary: Colors.textTertiary,
  border: Colors.border,
  error: Colors.error,
  success: Colors.success,
  warning: Colors.warning,
  info: Colors.info,
  gray100: '#1A1A24',
  gray200: '#2A2A34',
  gray300: '#3A3A44',
  gray400: Colors.textTertiary,
  gray500: Colors.textSecondary,
  gray600: '#8A8A92',
  overlay: Colors.overlay,
} as const;

export const spacing = {
  xs: Spacing.xs,
  sm: Spacing.sm,
  md: 12,
  lg: Spacing.md,
  xl: Spacing.lg,
  xxl: Spacing.xl,
  xxxl: Spacing.xxl,
} as const;

export const typography = {
  h1: { fontSize: Typography.fontSize['4xl'] },
  h2: { fontSize: Typography.fontSize['3xl'] },
  h3: { fontSize: Typography.fontSize['2xl'] },
  h4: { fontSize: Typography.fontSize.xl },
  h5: { fontSize: Typography.fontSize.lg },
  body: { fontSize: Typography.fontSize.base },
  bodyBold: { fontSize: Typography.fontSize.base },
  caption: { fontSize: Typography.fontSize.xs },
  small: { fontSize: 10 },
} as const;

export const borderRadius = {
  sm: BorderRadius.sm,
  md: BorderRadius.md,
  lg: BorderRadius.lg,
  xl: 16,
  xxl: 24,
  full: BorderRadius.full,
} as const;

export const shadows = Shadows;
