import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { colors, radii, shadow, spacing } from '../theme';
import { Button, type ButtonVariant } from './Button';
import { Text } from './Text';

export interface DialogProps {
  visible: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryVariant?: ButtonVariant;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Android back button / outside dismissal. Usually the same as onSecondary. */
  onDismiss: () => void;
  testID?: string;
}

export function Dialog({
  visible,
  title,
  message,
  children,
  primaryLabel,
  onPrimary,
  primaryVariant = 'primary',
  primaryLoading,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  onDismiss,
  testID,
}: DialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal testID={testID}>
          <Text variant="section" accessibilityRole="header">
            {title}
          </Text>
          {message ? <Text color="textMuted">{message}</Text> : null}
          {children}
          <View style={styles.actions}>
            <Button
              label={primaryLabel}
              onPress={onPrimary}
              variant={primaryVariant}
              loading={primaryLoading}
              disabled={primaryDisabled}
            />
            {secondaryLabel && onSecondary ? (
              <Button label={secondaryLabel} onPress={onSecondary} variant="secondary" />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.screenInset,
    backgroundColor: colors.scrim,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  actions: { gap: spacing.sm },
});
