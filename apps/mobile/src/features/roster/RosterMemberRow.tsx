import type { RosterEntry } from '@snowsync/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { StatusBadge } from '../../components/StatusBadge';
import { Text } from '../../components/Text';
import { colors, radii, sizes, spacing } from '../../theme';
import { initials, isUnpaid, paymentLabel, statusLine } from './rosterFormat';

/** Props for {@link RosterMemberRow}. */
export interface RosterMemberRowProps {
  entry: RosterEntry;
  timeZone: string;
  onPress: () => void;
}

/**
 * One member on the officer roster (Figma catalog 22 page 71): initials, name, payment and officer
 * badges, and a status line. Late arrivals get an amber row, never red: late is not an emergency.
 */
export function RosterMemberRow({ entry, timeZone, onPress }: RosterMemberRowProps) {
  const late = (entry.lateMinutes ?? 0) > 0;
  const payment = paymentLabel(entry);
  const line = statusLine(entry, timeZone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.displayName}, ${line}`}
      accessibilityHint="Opens actions for this member"
      onPress={onPress}
      style={({ pressed }) => [styles.row, late && styles.late, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text variant="label" color="brandGreen">
          {initials(entry.displayName)}
        </Text>
      </View>
      <View style={styles.body}>
        <View style={styles.nameLine}>
          <Text variant="bodyStrong">{entry.displayName}</Text>
          {payment ? (
            <StatusBadge
              label={payment}
              tone={isUnpaid(entry) ? 'red' : payment === 'Paid' ? 'green' : 'neutral'}
              icon={isUnpaid(entry) ? 'cash-remove' : 'cash-check'}
            />
          ) : null}
          {entry.role !== 'MEMBER' ? (
            <StatusBadge label="Officer" tone="blue" icon="shield-account-outline" />
          ) : null}
        </View>
        <Text variant="caption" color={late ? 'late' : 'textMuted'}>
          {line}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.minTouchTargetAndroid,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.field,
  },
  late: { backgroundColor: colors.lateSoft },
  pressed: { backgroundColor: colors.subtleFill },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.brandGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  nameLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
});
