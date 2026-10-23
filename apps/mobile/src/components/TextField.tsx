import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '../theme';
import { Text } from './Text';

/** Props for {@link TextField}: a label plus the usual TextInput props. */
export interface TextFieldProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'textContentType'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'editable'
  | 'maxLength'
> {
  /** Visible label above the field, also its accessibility label. */
  label: string;
  /** Error under the field. Turns the border red and is announced to screen readers. */
  error?: string;
  /** Muted help text under the field (hidden while an error shows). */
  helperText?: string;
  testID?: string;
}

/**
 * The one text input for every form (sign-up, sign-in, reset, onboarding). Figma field style:
 * radius 12, 1 px border, 52 pt tall, Inter body text, label above, error or help text below.
 */
export function TextField({ label, error, helperText, testID, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.emergency : focused ? colors.brandGreen : colors.border;
  return (
    <View style={styles.container}>
      <Text variant="label">{label}</Text>
      <TextInput
        {...inputProps}
        testID={testID}
        accessibilityLabel={label}
        accessibilityHint={error ?? helperText}
        allowFontScaling
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.textMuted}
        underlineColorAndroid="transparent"
        style={[styles.input, { borderColor }]}
      />
      {error ? (
        <Text variant="caption" color="emergency" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color="textMuted">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: sizes.primaryButtonHeight,
    borderWidth: 1,
    borderRadius: radii.field,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
});
