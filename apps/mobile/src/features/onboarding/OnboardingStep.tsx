import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { colors, radii, spacing } from '../../theme';

/** Total number of onboarding steps. */
export const ONBOARDING_STEP_COUNT = 7;

/** Previous onboarding route for each step after Welcome. */
const PREVIOUS_ROUTES = {
  2: '/(onboarding)',
  3: '/(onboarding)/profile',
  4: '/(onboarding)/emergency-contact',
  5: '/(onboarding)/notifications',
  6: '/(onboarding)/location-privacy',
  7: '/(onboarding)/offline',
} as const;

/** Props for OnboardingStep. */
export interface OnboardingStepProps {
  /** 1-based step number. */
  step: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
}

/** Shared onboarding frame with progress and navigation controls. */
export function OnboardingStep({
  step,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryLoading,
  primaryDisabled,
}: OnboardingStepProps) {
  const progress = `${step} of ${ONBOARDING_STEP_COUNT}`;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    const previousRoute = PREVIOUS_ROUTES[step as keyof typeof PREVIOUS_ROUTES];

    if (previousRoute) {
      router.replace(previousRoute);
    }
  };

  const continueButton = (
    <Button
      label={primaryLabel}
      onPress={onPrimary}
      loading={primaryLoading}
      disabled={primaryDisabled}
    />
  );

  return (
    <Screen scroll>
      <BrandHeader eyebrow="ONBOARDING" title={title} subtitle={subtitle} />

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${progress}`}
        accessibilityValue={{
          min: 1,
          max: ONBOARDING_STEP_COUNT,
          now: step,
        }}
        style={styles.progressRow}
      >
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${(step / ONBOARDING_STEP_COUNT) * 100}%`,
              },
            ]}
          />
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

          <View style={styles.continueButton}>{continueButton}</View>
        </View>
      ) : (
        continueButton
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
    flex: 1,
  },
});
