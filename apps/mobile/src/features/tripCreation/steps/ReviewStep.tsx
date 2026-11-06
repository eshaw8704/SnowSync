import { Text } from '../../../components/Text';
import { TripWizardStep } from '../TripWizardStep';
import { useTripWizardStore } from '../tripWizardStore';

/**
 * Step 6 · Review. A placeholder until SS-132 (Jacob) replaces this whole file with the real
 * summary, the Create trip button and the confirmation. TripWizardScreen already renders it.
 */
export function ReviewStep() {
  const back = useTripWizardStore((state) => state.back);
  return (
    <TripWizardStep
      step={6}
      title="Ready for review."
      primaryLabel="Back to roster"
      onPrimary={back}
    >
      <Text color="textMuted">The review step arrives with SS-132.</Text>
    </TripWizardStep>
  );
}
