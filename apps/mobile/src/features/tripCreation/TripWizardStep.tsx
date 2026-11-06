import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { colors, radii, spacing } from '../../theme';
import { STEP_SUBTITLES, WIZARD_STEP_COUNT, type WizardStep } from './tripDraft';

/** Props for {@link TripWizardStep}. */
export interface TripWizardStepProps {
  step: WizardStep;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
  /** Optional second button under the primary one (the Review step's "Edit details"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * The frame of every create-trip step (Figma catalog 09): a six-segment progress bar,
 * "Step N of 6 · …", a title, the step's fields and one primary button.
 */
export function TripWizardStep({
  step,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryLoading,
  secondaryLabel,
  onSecondary,
}: TripWizardStepProps) {
  const progress = `Step ${step} of ${WIZARD_STEP_COUNT} · ${STEP_SUBTITLES[step]}`;
  return (
    <Screen scroll edges={['bottom']}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${WIZARD_STEP_COUNT}`}
        accessibilityValue={{ min: 1, max: WIZARD_STEP_COUNT, now: step }}
        style={styles.segments}
      >
        {Array.from({ length: WIZARD_STEP_COUNT }, (_, index) => (
          <View
            key={index}
            style={[styles.segment, index < step ? styles.segmentDone : styles.segmentTodo]}
          />
        ))}
      </View>
      <Text variant="caption" color="textMuted">
        {progress}
      </Text>
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text color="textMuted">{subtitle}</Text> : null}
      </View>
      {children}
      <Button label={primaryLabel} onPress={onPrimary} loading={primaryLoading} />
      {secondaryLabel && onSecondary ? (
        <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 4, borderRadius: radii.pill },
  segmentDone: { backgroundColor: colors.brandGreen },
  segmentTodo: { backgroundColor: colors.subtleFill },
  titles: { gap: spacing.xs },
});
