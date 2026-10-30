import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, sizes, spacing } from '../theme';
import { Text } from './Text';

export interface ListRowProps {
  label: string;
  description?: string;
  onPress: () => void;
  /** Red label for actions such as "Sign out". */
  destructive?: boolean;
  testID?: string;
}

/** A tappable settings-style row with a chevron. */
export function ListRow({ label, description, onPress, destructive, testID }: ListRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text variant="bodyStrong" color={destructive ? 'emergency' : 'textPrimary'}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color="textMuted">
            {description}
          </Text>
        ) : null}
      </View>
      {destructive ? null : (
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
      )}
    </Pressable>
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
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
});
