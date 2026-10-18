import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export type ErrorVariant = 'network' | 'forbidden' | 'notFound' | 'unknown';

export const ERROR_COPY: Record<
  ErrorVariant,
  { title: string; message: string; actionLabel: string }
> = {
  network: {
    title: 'Network request failed',
    message:
      "We couldn't reach SnowSync. Cached content shows its last-updated time, and queued work isn't delivered yet.",
    actionLabel: 'Retry connection',
  },
  forbidden: {
    title: "You don't have permission",
    message:
      "You don't have permission to access this feature. Officer-only tools aren't available to member accounts.",
    actionLabel: 'Back to member Home',
  },
  notFound: {
    title: "We can't find this trip",
    message: 'The link may be invalid, or this trip or resource is no longer available.',
    actionLabel: 'Back to Trips',
  },
  unknown: {
    title: 'Something went wrong',
    message:
      'Your saved local data is kept. Return to a known screen, and contact club support if this keeps happening.',
    actionLabel: 'Back to Home',
  },
};

/** Label of the optional secondary action. */
export const CONTACT_SUPPORT_LABEL = 'Contact club support';

export interface ErrorStateProps {
  variant: ErrorVariant;
  onAction: () => void;
  onContactSupport?: () => void;
  title?: string;
  message?: string;
  actionLabel?: string;
  testID?: string;
}

// Explains a failure in plain words and offers a recovery step
export function ErrorState({
  variant,
  onAction,
  onContactSupport,
  title,
  message,
  actionLabel,
  testID,
}: ErrorStateProps) {
  const copy = ERROR_COPY[variant];
  return (
    <View testID={testID} style={styles.panel} accessibilityRole="alert">
      <View style={styles.header}>
        <View style={styles.iconCircle} accessibilityElementsHidden importantForAccessibility="no">
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.late} />
        </View>
        <Text variant="bodyStrong" accessibilityRole="header" style={styles.title}>
          {title ?? copy.title}
        </Text>
      </View>
      <Text color="textMuted">{message ?? copy.message}</Text>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button label={actionLabel ?? copy.actionLabel} onPress={onAction} />
        </View>
        {onContactSupport ? (
          <View style={styles.action}>
            <Button label={CONTACT_SUPPORT_LABEL} onPress={onContactSupport} variant="secondary" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.warningPanel,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.warningIconFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1, flexBasis: 140 },
});
