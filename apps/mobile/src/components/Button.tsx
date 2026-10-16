import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, sizes, spacing, type ColorToken } from '../theme';
import { Text } from './Text';

/** Visual style of a {@link Button}. */
export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

/** Props for {@link Button}. */
export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  //Greys the button out and ignores presses
  disabled?: boolean;
  //Shows a spinner, ignores presses and announces "busy".
  loading?: boolean;
  accessibilityHint?: string;
  //For TEsting
  testID?: string;
}

const FILL: Record<ButtonVariant, { idle: ColorToken; pressed: ColorToken; text: ColorToken }> = {
  primary: { idle: 'brandGreen', pressed: 'brandGreenDeep', text: 'textOnBrand' },
  secondary: { idle: 'surface', pressed: 'subtleFill', text: 'brandGreen' },
  destructive: { idle: 'emergency', pressed: 'emergency', text: 'textOnBrand' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  const fill = FILL[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: colors[pressed ? fill.pressed : fill.idle] },
        variant === 'secondary' && styles.secondaryBorder,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={disabled ? colors.textPrimary : colors[fill.text]}
            accessibilityElementsHidden
          />
        ) : (
          <Text variant="label" color={disabled ? 'textMuted' : fill.text}>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.primaryButtonHeight,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryBorder: { borderWidth: 1, borderColor: colors.border },
  disabled: { backgroundColor: colors.subtleFill, borderWidth: 0 },
});
