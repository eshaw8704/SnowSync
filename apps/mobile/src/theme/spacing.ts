/** 4 px rhythm from Figma catalog 00. */
import { colors } from './colors';
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  /** Horizontal inset of every screen. */
  screenInset: 20,
} as const;

/** Corner radii from Figma catalog 00. */
export const radii = {
  card: 20,
  button: 14,
  field: 12,
  /** Fully rounded chips and badges. */
  pill: 999,
} as const;

/** Touch-target and control sizes. */
export const sizes = {
  /** Primary buttons are at least this tall (pt). */
  primaryButtonHeight: 52,
  /** Smallest allowed touch target on iOS (pt). */
  minTouchTargetIos: 44,
  /** Smallest allowed touch target on Android (dp). */
  minTouchTargetAndroid: 48,
} as const;

/** "Quiet depth": the one card shadow (y 4, blur 16, #123C26 at ~6 % opacity). */
export const shadow = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
