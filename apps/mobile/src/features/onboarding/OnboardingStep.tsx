import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { colors, radii, spacing } from '../../theme';

/** Total number of onboarding steps (Figma catalog 04 · 2 shows "1 of 7" … "7 of 7"). */
export const ONBOARDING_STEP_COUNT = 7;

/** Props for {@link OnboardingStep}. */
export interface OnboardingStepProps {
  /** 1-based step number. */
  step: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
}

/** The frame of every onboarding screen: header, "N of 7" progress bar, content and navigation actions. */
export function OnboardingStep({
  step,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryLoading,
}: OnboardingStepProps) {
  const progress = `${step} of ${ONBOARDING_STEP_COUNT}`;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <Screen scroll>
      <BrandHeader eyebrow="ONBOARDING" title={title} subtitle={subtitle} />

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${progress}`}
        accessibilityValue={{ min: 1, max: ONBOARDING_STEP_COUNT, now: step }}
        style={styles.progressRow}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(step / ONBOARDING_STEP_COUNT) * 100}%` }]} />
        </View>
        <Text variant="caption" color="textMuted">
          {progress}
        </Text>
      </View>

      {children}

      {step > 1 ? (
        <View style={styles.actions}>
          <View style={styles.backButton}>
            <Button
              label="Back"
              variant="secondary"
              onPress={handleBack}
              disabled={primaryLoading}
              testID="onboarding-back-button"
            />
          </View>

          <View style={styles.continueButton}>
            <Button label={primaryLabel} onPress={onPrimary} loading={primaryLoading} />
          </View>
        </View>
      ) : (
        <Button label={primaryLabel} onPress={onPrimary} loading={primaryLoading} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.subtleFill,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.brandGreen,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});
