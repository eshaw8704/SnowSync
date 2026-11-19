import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing, type ColorToken } from '../theme';
import type { BadgeTone } from './StatusBadge';
import { Text } from './Text';

const CHIP: Record<BadgeTone, { fill: ColorToken; text: ColorToken }> = {
  green: { fill: 'brandGreenSoft', text: 'brandGreen' },
  blue: { fill: 'locationSoft', text: 'location' },
  neutral: { fill: 'surface', text: 'textMuted' },
  amber: { fill: 'lateSoft', text: 'late' },
  red: { fill: 'emergencySoft', text: 'emergency' },
};

/** One number tile under the hero title, such as Price $50 or Spots 8 left. */
export interface HeroStat {
  label: string;
  value: string;
  /** Red text for numbers that need attention (Unpaid on the roster). Always with the label. */
  tone?: 'default' | 'red';
}

/** Props for {@link StatusHero}. */
export interface StatusHeroProps {
  /** The short status word in the chip: OPEN, CONFIRM, REGISTERED, FULL, CANCELLED… */
  chip: string;
  tone: BadgeTone;
  /** Small caption beside the chip, e.g. "Registration open". */
  caption?: string;
  title: string;
  subtitle?: string;
  stats?: HeroStat[];
  variant?: 'panel' | 'plain';
  testID?: string;
}

export function StatusHero({
  chip,
  tone,
  caption,
  title,
  subtitle,
  stats,
  variant = 'panel',
  testID,
}: StatusHeroProps) {
  const colorsFor = CHIP[tone];
  return (
    <View style={[styles.hero, variant === 'panel' && styles.panel]} testID={testID}>
      <View style={styles.chipRow}>
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Status: ${chip}`}
          style={[styles.chip, { backgroundColor: colors[colorsFor.fill] }]}
        >
          <Text variant="caption" color={colorsFor.text} style={styles.chipText}>
            {chip}
          </Text>
        </View>
        {caption ? (
          <Text variant="label" color="textMuted">
            {caption}
          </Text>
        ) : null}
      </View>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text color="textMuted">{subtitle}</Text> : null}
      {stats && stats.length > 0 ? (
        <View style={styles.stats}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={styles.stat}
              accessible
              accessibilityLabel={`${stat.label}: ${stat.value}`}
            >
              <Text variant="caption" color="textMuted">
                {stat.label}
              </Text>
              <Text variant="bodyStrong" color={stat.tone === 'red' ? 'emergency' : 'textPrimary'}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  panel: { backgroundColor: colors.subtleFill, borderRadius: radii.card, padding: spacing.md },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  chipText: { fontWeight: '700', letterSpacing: 0.6 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.field,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
});
