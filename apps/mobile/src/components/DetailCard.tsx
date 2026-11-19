import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, type ColorToken } from '../theme';
import { Card } from './Card';
import { Text } from './Text';

export interface DetailRow {
  label: string;
  value: string;
  valueColor?: ColorToken;
}

export interface DetailCardProps {
  title: string;
  rows?: DetailRow[];
  /** A paragraph, shown under the rows. */
  note?: string;
  children?: ReactNode;
  testID?: string;
}

export function DetailCard({ title, rows, note, children, testID }: DetailCardProps) {
  return (
    <Card testID={testID} style={styles.card}>
      <Text variant="bodyStrong" accessibilityRole="header">
        {title}
      </Text>
      {rows?.map((row, index) => (
        <View
          key={row.label}
          style={[styles.row, index > 0 && styles.divider]}
          accessible
          accessibilityLabel={`${row.label}: ${row.value}`}
        >
          <Text color="textMuted">{row.label}</Text>
          <Text variant="bodyStrong" color={row.valueColor ?? 'textPrimary'} style={styles.value}>
            {row.value}
          </Text>
        </View>
      ))}
      {note ? <Text color="textMuted">{note}</Text> : null}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  value: { flexShrink: 1, textAlign: 'right' },
});
