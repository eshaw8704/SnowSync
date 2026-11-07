import { router } from 'expo-router';
import type { ComponentType } from 'react';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { selectHasPermission, useAuthStore } from '../../state/authStore';
import { BasicsStep } from './steps/BasicsStep';
import { RegistrationStep } from './steps/RegistrationStep';
import { ResortStep } from './steps/ResortStep';
import { ReviewStep } from './steps/ReviewStep';
import { RosterStep } from './steps/RosterStep';
import { ScheduleStep } from './steps/ScheduleStep';
import type { StepProps } from './steps/stepProps';
import { TripWizardStep } from './TripWizardStep';
import { useTripWizardStore } from './tripWizardStore';

/** Title, subtitle and button for steps 1 to 5 (Figma catalog 09, word for word). */
const STEPS: Record<
  1 | 2 | 3 | 4 | 5,
  { title: string; subtitle: string; primary: string; Component: ComponentType<StepProps> }
> = {
  1: {
    title: 'Plan a mountain day',
    subtitle: 'Tell us the basics for your trip.',
    primary: 'Continue to resort',
    Component: BasicsStep,
  },
  2: {
    title: 'Set the meeting area',
    subtitle: 'Choose the resort and configure the geofence for automatic check-in.',
    primary: 'Confirm resort & geofence',
    Component: ResortStep,
  },
  3: {
    title: 'Who can join?',
    subtitle: 'Set registration window, capacity, and per-member cost.',
    primary: 'Continue to schedule',
    Component: RegistrationStep,
  },
  4: {
    title: 'Set the trip timeline',
    subtitle: 'Schedule each lifecycle transition. Officers can override these later.',
    primary: 'Continue to roster',
    Component: ScheduleStep,
  },
  5: {
    title: 'Start your roster',
    subtitle: 'Add approved club members to the initial roster.',
    primary: 'Review trip',
    Component: RosterStep,
  },
};

/**
 * The create-trip wizard (SS-37): six steps in one screen, driven by the wizard store. Only
 * officers with MANAGE_TRIPS can use it; the server checks again on POST /trips.
 */
export function TripWizardScreen() {
  const canManage = useAuthStore(selectHasPermission('MANAGE_TRIPS'));
  const { draft, step, errors, update, next, back } = useTripWizardStore();

  if (!canManage) {
    return (
      <Screen>
        <ErrorState
          variant="forbidden"
          message="Only officers who manage trips can create one."
          actionLabel="Back to Trips"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }
  if (step === 6) {
    return <ReviewStep />;
  }
  const { title, subtitle, primary, Component } = STEPS[step];
  return (
    <TripWizardStep
      step={step}
      title={title}
      subtitle={subtitle}
      primaryLabel={primary}
      onPrimary={() => {
        next();
      }}
      secondaryLabel={step > 1 ? 'Back' : undefined}
      onSecondary={step > 1 ? back : undefined}
    >
      <Component value={draft} onChange={update} errors={errors} />
    </TripWizardStep>
  );
}
