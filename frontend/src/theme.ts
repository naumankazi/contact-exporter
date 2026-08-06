// Central design tokens derived from /app/design_guidelines.json
// "1 iOS-Native Clean" personality. Moss Green brand accent.

export const palette = {
  light: {
    surface: "#FFFFFF",
    onSurface: "#0F0F10",
    surfaceSecondary: "#F2F2F7",
    onSurfaceSecondary: "#3A3A3C",
    surfaceTertiary: "#E5E5EA",
    onSurfaceTertiary: "#8E8E93",
    surfaceInverse: "#1C1C1E",
    onSurfaceInverse: "#FFFFFF",
    brandPrimary: "#4F6B56",
    onBrandPrimary: "#FFFFFF",
    brandTertiary: "#E8EBE9",
    onBrandTertiary: "#4F6B56",
    success: "#34C759",
    error: "#FF3B30",
    border: "#E5E5EA",
    divider: "#E5E5EA",
  },
  dark: {
    surface: "#000000",
    onSurface: "#FFFFFF",
    surfaceSecondary: "#1C1C1E",
    onSurfaceSecondary: "#EBEBF5",
    surfaceTertiary: "#2C2C2E",
    onSurfaceTertiary: "#98989D",
    surfaceInverse: "#FFFFFF",
    onSurfaceInverse: "#000000",
    brandPrimary: "#5F8569",
    onBrandPrimary: "#FFFFFF",
    brandTertiary: "#1A241D",
    onBrandTertiary: "#5F8569",
    success: "#32D74B",
    error: "#FF453A",
    border: "#38383A",
    divider: "#38383A",
  },
};

export type ThemeColors = typeof palette.light;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const fontSize = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
};
