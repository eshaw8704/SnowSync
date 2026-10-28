/**
 * SnowSync color tokens from Figma catalog 00 (Foundations) and the component sheets.
 * Components must use these names. Never write a hex value anywhere else in the app.
 */
export const colors = {
  /** Sac State green: primary actions, active tab, brand. */
  brandGreen: '#00573D',
  /** Deep green: pressed primary buttons, hero cards. */
  brandGreenDeep: '#003C2B',
  /** White surfaces: cards, sheets, tab bar. */
  surface: '#FFFFFF',
  /** Off-white app background behind cards. */
  background: '#F4F7F5',
  /** Inner panel fill (empty-state detail panel). */
  panel: '#F7FAF8',
  /** Quiet fill: skeleton blocks, icon tiles, chips, disabled buttons. */
  subtleFill: '#E9EEEB',
  /** 1 px borders on cards, fields and secondary buttons. */
  border: '#DCE5DF',
  /** Charcoal: primary text. */
  textPrimary: '#182B27',
  /** Muted text: secondary lines, captions, inactive tabs, disabled labels. */
  textMuted: '#64746F',
  /** Text and icons on green or red fills. */
  textOnBrand: '#FFFFFF',
  /** Location and sync information. */
  location: '#176D99',
  /** Emergency and destructive actions. Always paired with the word, never color alone. */
  emergency: '#C42D36',
  /** Late, stale or warning information. */
  late: '#8E5C0B',
  /** Warm panel behind error states. */
  warningPanel: '#FFF7F2',
  /** Border of the warm error panel. */
  warningBorder: '#F5E2D6',
  /** Circle behind the error-state icon. */
  warningIconFill: '#E4C7AF',
  /** Dim layer behind dialogs (charcoal at 45 % opacity). */
  scrim: 'rgba(24, 43, 39, 0.45)',
  /** Card shadow color (used with shadow.card opacity). */
  shadow: '#123C26',
} as const;

/** Name of one color token. */
export type ColorToken = keyof typeof colors;
