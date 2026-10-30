import { router } from 'expo-router';
import { useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { Text } from '../../components/Text';
import { useAuthStore } from '../../state/authStore';
import { loadMe } from '../auth/sessionManager';
import { completeOnboarding } from './onboardingApi';
import { OnboardingStep } from './OnboardingStep';

/** A labelled fact inside an info card. */
function Fact({ label, text }: { label: string; text: string }) {
  return (
    <Card>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      <Text>{text}</Text>
    </Card>
  );
}

/** Step 1 (Figma: Onboarding / Welcome). */
export function WelcomeStep() {
  return (
    <OnboardingStep
      step={1}
      title="More mountain. Less guesswork."
      primaryLabel="Get started"
      onPrimary={() => router.push('/profile')}
    >
      <Fact
        label="WHAT YOU'LL GET"
        text="Trips, check-in and your crew's location, all in one place."
      />
    </OnboardingStep>
  );
}

/** Step 5 (Figma: Onboarding / Location Privacy). Explanation only; no permission is requested here. */
export function LocationPrivacyStep() {
  return (
    <OnboardingStep
      step={5}
      title="Shared on the mountain. Not everywhere."
      subtitle="Location is tied to eligible active participation."
      primaryLabel="Continue"
      onPrimary={() => router.push('/offline')}
    >
      <Fact
        label="WHO CAN SEE IT?"
        text="Eligible active participants and officers for your trip."
      />
      <Fact label="WHEN IT STARTS" text="Only after you check in and enter an active session." />
      <Fact
        label="WHEN IT ENDS"
        text="Leaving, check-out or session end stops sharing and background tracking."
      />
    </OnboardingStep>
  );
}

/** Step 6 (Figma: Onboarding / Offline Explanation). */
export function OfflineStep() {
  return (
    <OnboardingStep
      step={6}
      title="No signal? Still clear."
      subtitle="Know what is stored and what is delivered."
      primaryLabel="I understand"
      onPrimary={() => router.push('/complete')}
    >
      <Fact
        label="LAST-KNOWN LOCATIONS"
        text="Cached positions always show timestamps; they are not live."
      />
      <Fact
        label="QUEUED IS NOT DELIVERED"
        text="Messages and updates show pending status until acknowledged."
      />
    </OnboardingStep>
  );
}

/** Step 7 (Figma: Onboarding / Complete). Marks onboarding complete, then the gate opens Home. */
export function CompleteStep() {
  const name = useAuthStore((state) => state.user?.displayName.split(' ')[0] ?? 'friend');
  const [finishing, setFinishing] = useState(false);
  const [problem, setProblem] = useState<'missingContact' | 'failed' | null>(null);

  const finish = async () => {
    setProblem(null);
    setFinishing(true);
    try {
      await completeOnboarding();
      await loadMe();
    } catch (error) {
      const missing =
        error instanceof ApiClientError && error.details?.reason === 'ONBOARDING_INCOMPLETE';
      setProblem(missing ? 'missingContact' : 'failed');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <OnboardingStep
      step={7}
      title={`You're ready, ${name}.`}
      primaryLabel="Go to Home"
      onPrimary={() => void finish()}
      primaryLoading={finishing}
    >
      <Fact
        label="PROFILE COMPLETE"
        text="Officers can recognize you on trip day, and your emergency contact is on file."
      />
      {problem === 'missingContact' ? (
        <ErrorState
          variant="unknown"
          title="Add an emergency contact first"
          message="The club needs someone to call before your first trip."
          actionLabel="Add emergency contact"
          onAction={() => router.push('/emergency-contact')}
        />
      ) : null}
      {problem === 'failed' ? (
        <ErrorState variant="network" actionLabel="Try again" onAction={() => void finish()} />
      ) : null}
    </OnboardingStep>
  );
}
