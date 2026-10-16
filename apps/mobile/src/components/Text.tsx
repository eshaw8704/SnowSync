import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { colors, typography, type ColorToken, type TypographyVariant } from '../theme';

/** Props for {@link Text}. */
export interface TextProps extends NativeTextProps {
  /** Type-scale variant. Defaults to "body". */
  variant?: TypographyVariant;
  /** Color token. Defaults to "textPrimary". */
  color?: ColorToken;
}

/**
 * The only text component screens should use. Applies the SnowSync type scale and
 * color tokens, and always scales with the device text-size setting.
 */
export function Text({ variant = 'body', color = 'textPrimary', style, ...rest }: TextProps) {
  return (
    <NativeText
      {...rest}
      allowFontScaling
      style={[typography[variant], { color: colors[color] }, style]}
    />
  );
}
