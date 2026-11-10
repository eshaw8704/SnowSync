import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Dialog } from '../../components/Dialog';
import { Text } from '../../components/Text';
import { sizes } from '../../theme';
import { EMPTY_DRAFT, type TripDraft } from './tripDraft';
import { useTripWizardStore } from './tripWizardStore';

/** True once the officer has entered anything, so leaving would lose work. */
export function hasDraftChanges(draft: TripDraft): boolean {
  return JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT);
}

/**
 * The wizard header's "Cancel". /trip/create is the first screen of the trip stack, so the header
 * has no back button of its own. Leaving clears the draft; with anything entered, it asks first.
 */
export function CancelTripWizardButton() {
  const draft = useTripWizardStore((state) => state.draft);
  const reset = useTripWizardStore((state) => state.reset);
  const [confirming, setConfirming] = useState(false);

  const leave = () => {
    setConfirming(false);
    reset();
    router.back();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel trip creation"
        onPress={() => (hasDraftChanges(draft) ? setConfirming(true) : leave())}
        hitSlop={8}
        style={{ minHeight: sizes.minTouchTargetIos, justifyContent: 'center' }}
      >
        <Text variant="label" color="brandGreen">
          Cancel
        </Text>
      </Pressable>
      <Dialog
        visible={confirming}
        title="Discard this trip?"
        message="Nothing has been saved yet. The details you entered will be cleared."
        primaryLabel="Discard trip"
        primaryVariant="destructive"
        onPrimary={leave}
        secondaryLabel="Keep editing"
        onSecondary={() => setConfirming(false)}
        onDismiss={() => setConfirming(false)}
      />
    </>
  );
}
