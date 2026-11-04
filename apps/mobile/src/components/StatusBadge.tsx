import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing, type ColorToken } from '../theme';
import { Text } from './Text';

/** Badge color families. Meaning always comes from the label and icon too, never color alone. */
export type BadgeTone = 'green' | 'blue' | 'neutral' | 'amber' | 'red';

const TONES: Record<BadgeTone, { fill: ColorToken; text: ColorToken }> = {
  green: { fill: 'brandGreenSoft', text: 'brandGreen' },
  blue: { fill: 'locationSoft', text: 'location' },
  neutral: { fill: 'subtleFill', text: 'textMuted' },
  amber: { fill: 'lateSoft', text: 'late' },
  red: { fill: 'emergencySoft', text: 'emergency' },
};

/** Props for {@link StatusBadge}. */
export interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  /** Small caps prefix such as "TRIP" or "YOU", shown before the label and read out first. */
  prefix?: string;
  testID?: string;
}

/**
 * A pill with an icon, an optional prefix and a label (Figma catalog 01 · 2, Participation).
 * Combines label, icon and color, never color alone (catalog 00). The base of TripStateBadge and
 * ParticipationBadge.
 */
export function StatusBadge({ label, tone, icon, prefix, testID }: StatusBadgeProps) {
  const { fill, text } = TONES[tone];
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={prefix ? `${prefix}: ${label}` : label}
      style={[styles.badge, { backgroundColor: colors[fill] }]}
    >
      <MaterialCommunityIcons name={icon} size={14} color={colors[text]} />
      {prefix ? (
        <Text variant="caption" color={text} style={styles.prefix}>
          {prefix}
        </Text>
      ) : null}
      <Text variant="label" color={text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  prefix: { letterSpacing: 0.6 },
});
