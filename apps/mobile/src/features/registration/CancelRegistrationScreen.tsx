import type { TripDetail } from '@snowsync/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { DetailCard } from '../../components/DetailCard';
import { ErrorState } from '../../components/ErrorState';
import { StatusHero } from '../../components/StatusHero';
import { StatusLayout } from '../../components/StatusLayout';
import { leaveFlow } from './RegisterConfirmScreen';
import { cancelRegistration } from './registrationApi';
import { canRegisterAgain } from './registrationState';
import { TripLoadGate } from './TripLoadGate';
import { useTripDetail } from './useTripDetail';

type Problem = 'network' | 'notAllowed' | null;

function CancelContent({ trip }: { trip: TripDetail }) {
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  const confirm = async () => {
    setSaving(true);
    setProblem(null);
    try {
      const result = await cancelRegistration(trip.id);
      // Only say the spot was released when the server says I no longer hold one. If my
      // participation changed in the meantime (say, an officer checked me in), nothing was
      // cancelled: go back to Trip detail, which shows where things stand.
      if (result.registration.participation === 'NOT_REGISTERED') {
        router.replace(`/trip/registration-result/${trip.id}?outcome=cancelled`);
      } else {
        leaveFlow(trip.id);
      }
    } catch (error) {
      const reason = error instanceof ApiClientError ? error.details?.reason : undefined;
      setProblem(reason === 'CANCEL_NOT_ALLOWED' ? 'notAllowed' : 'network');
      setSaving(false);
    }
  };

  return (
    <StatusLayout
      footer={
        <>
          <Button
            label="Cancel registration"
            variant="destructive"
            onPress={() => void confirm()}
            loading={saving}
            disabled={problem === 'notAllowed'}
          />
          <Button
            label="Keep my spot"
            variant="secondary"
            disabled={saving}
            onPress={() => leaveFlow(trip.id)}
          />
        </>
      }
    >
      <StatusHero
        chip="CANCEL"
        tone="red"
        caption="Releases your spot"
        title="Cancel your registration?"
        subtitle={`Your ${trip.resortName} spot will be released. This does not cancel the trip. Payment or refund questions go to the treasurer; no automatic refund is promised.`}
      />
      {problem === 'notAllowed' ? (
        <ErrorState
          variant="forbidden"
          title="You can't cancel now"
          message="Cancelling is only possible while registration is open and before you check in. Ask an officer for help."
          actionLabel="Back to trip"
          onAction={() => leaveFlow(trip.id)}
        />
      ) : null}
      {problem === 'network' ? (
        <ErrorState
          variant="network"
          title="Your cancellation wasn't sent"
          message="Your spot is still saved. Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void confirm()}
        />
      ) : null}
      <DetailCard
        title="Cancellation impact"
        rows={[
          { label: 'Spot', value: 'Released' },
          { label: 'Trip', value: 'Remains open' },
          { label: 'Refund', value: 'Contact treasurer' },
        ]}
      />
      <DetailCard
        title="Cancellation note"
        note={
          canRegisterAgain(trip)
            ? 'You can register again while spots remain. The trip stays open for other members.'
            : "Registration has closed, so you can't register again yourself. An officer can still add you if there's room."
        }
      />
    </StatusLayout>
  );
}

/**
 * "Cancel your registration?" (SS-31, Figma catalog 10 page 35). Route
 * /trip/cancel-registration/:tripId. "Keep my spot" and the header back button leave without
 * changing anything.
 */
export function CancelRegistrationScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { state, reload } = useTripDetail(tripId);
  return (
    <TripLoadGate state={state} onRetry={reload}>
      {(trip) => <CancelContent trip={trip} />}
    </TripLoadGate>
  );
}
