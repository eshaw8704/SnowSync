import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;

  message: string;

  actionLabel: string;
  onAction: () => void;
  subtitle?: string;
  statusLabel?: string;

  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  testID?: string;
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  subtitle,
  statusLabel,
  icon = 'information-outline',
  testID,
}: EmptyStateProps) {
  return (
    <Card testID={testID} style={styles.card}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <View
            style={styles.iconTile}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <MaterialCommunityIcons name={icon} size={20} color={colors.textPrimary} />
          </View>
          <View style={styles.titles}>
            <Text variant="bodyStrong" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" color="textMuted">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {statusLabel ? (
            <View style={styles.chip}>
              <Text variant="caption" color="textMuted">
                {statusLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text color="textMuted">{message}</Text>
      </View>
      <Button label={actionLabel} onPress={onAction} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.field,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.field,
    backgroundColor: colors.subtleFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1 },
  chip: {
    backgroundColor: colors.subtleFill,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
