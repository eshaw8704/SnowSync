import { StyleSheet, Switch, View } from 'react-native';
import { colors, sizes, spacing } from '../theme';
import { Text } from './Text';

/** Props for {@link ToggleRow}. */
export interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Short note under the description, e.g. "Always on for safety". */
  note?: string;
  testID?: string;
}

/**
 * A labelled on/off row (Figma catalog 25, Notification preferences). Used for notification
 * choices and for the executive Role permissions screen.
 */
export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  note,
  testID,
}: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="caption" color="textMuted">
            {description}
          </Text>
        ) : null}
        {note ? (
          <Text variant="caption" color="brandGreen">
            {note}
          </Text>
        ) : null}
      </View>
      <Switch
        testID={testID}
        accessibilityLabel={label}
        accessibilityHint={description}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityState={{ disabled: !!disabled, checked: value }}
        trackColor={{ false: colors.subtleFill, true: colors.brandGreen }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.subtleFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: sizes.minTouchTargetAndroid,
    paddingVertical: spacing.sm,
  },
  text: { flex: 1, gap: 2 },
});
