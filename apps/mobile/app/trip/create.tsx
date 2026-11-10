import { Stack } from 'expo-router';
import { CancelTripWizardButton } from '../../src/features/tripCreation/CancelTripWizardButton';
import { TripWizardScreen } from '../../src/features/tripCreation/TripWizardScreen';

/** Route /trip/create: the create-trip wizard, opened from the Trips tab's "Create trip" button. */
export default function CreateTripRoute() {
  return (
    <>
      <Stack.Screen options={{ headerLeft: () => <CancelTripWizardButton /> }} />
      <TripWizardScreen />
    </>
  );
}
