import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, sizes, spacing, type ColorToken } from '../theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
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
        <Text
          variant="label"
          color={disabled ? 'textMuted' : fill.text}
          style={[styles.label, loading && styles.hiddenLabel]}
          accessibilityElementsHidden={loading}
          importantForAccessibility={loading ? 'no-hide-descendants' : 'auto'}
        >
          {label}
        </Text>

        {loading && (
          <ActivityIndicator
            style={styles.spinner}
            color={disabled ? colors.textPrimary : colors[fill.text]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
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
  content: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
  hiddenLabel: {
    opacity: 0,
  },
  spinner: {
    position: 'absolute',
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    backgroundColor: colors.subtleFill,
    borderWidth: 0,
  },
});
