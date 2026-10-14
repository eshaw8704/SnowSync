import type { TextStyle } from 'react-native';

/**
 * Inter font family names. These exact names are loaded in app/_layout.tsx
 * (Inter_400Regular, Inter_600SemiBold, Inter_700Bold). Do not add weights here
 * without also loading them there.
 */
export const fontFamily = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/**
 * Type scale from Figma catalog 00: Display 34/38 · Title 28/31 · Section 20/26 ·
 * Body 15/23 · Label 13/18 · Caption 12/18. Bold headings, semibold actions.
 */
export const typography = {
  display: { fontFamily: fontFamily.bold, fontSize: 34, lineHeight: 38 },
  title: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 31 },
  section: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 23 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 23 },
  label: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18 },
} as const satisfies Record<string, TextStyle>;

/** Name of one type-scale variant. */
export type TypographyVariant = keyof typeof typography;