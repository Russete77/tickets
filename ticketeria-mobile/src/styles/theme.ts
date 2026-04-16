import { Colors, Typography, Spacing, BorderRadius } from './tokens';

export interface Theme {
  colors: typeof Colors;
  typography: typeof Typography;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
}

export const darkTheme: Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
};

export const lightTheme: Theme = {
  colors: {
    // Primary light theme
    bg: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceAlt: '#EBEBEB',
    border: '#E0E0E0',

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
    textPrimary: '#0A0A0F',
    textSecondary: '#5A5A62',
    textTertiary: '#A0A0A8',
    textInverse: '#FFFFFF',

    // Background states
    bgHover: '#EBEBEB',
    bgActive: '#E0E0E0',
    bgDisabled: '#F5F5F5',

    // Additional accent shades
    accentSuccess: '#26D65E',
    accentError: '#FF6B6B',
    accentWarning: '#FFD93D',

    // Overlay and transparency
    overlay: 'rgba(255, 255, 255, 0.8)',
    overlayLight: 'rgba(0, 0, 0, 0.1)',

    // Gradient base colors
    gradientStart: '#6C5CE7',
    gradientEnd: '#4A4080',
  },
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
};

/**
 * Get current theme based on user preference.
 * Returns dark theme by default. Extend this to support system preference.
 */
export function getCurrentTheme(): Theme {
  // TODO: Integrate with device color scheme preference
  // For now, default to dark theme
  return darkTheme;
}

export const theme = getCurrentTheme();
