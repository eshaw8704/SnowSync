import type { TripDetail } from '@snowsync/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { DetailCard } from '../../components/DetailCard';
import { ErrorState } from '../../components/ErrorState';
import { StatusHero } from '../../components/StatusHero';
import { StatusLayout } from '../../components/StatusLayout';
import { newOpId } from '../tripManagement/opId';
import { formatCost, formatShortDate } from '../trips/tripFormat';
import { register } from './registrationApi';
import type { RegistrationOutcome } from './registrationState';
import { TripLoadGate } from './TripLoadGate';
import { useTripDetail } from './useTripDetail';

/** Leaves the confirm screen without registering. */
export function leaveFlow(tripId: string): void {
  if (router.canGoBack()) router.back();
  else router.replace(`/trip/${tripId}`);
}

function ConfirmContent({ trip }: { trip: TripDetail }) {
  // One opId per visit: retrying after a network error can never register twice.
  const opId = useRef(newOpId()).current;
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const tz = trip.resortTimeZone;
  const spotsLeft = Math.max(0, trip.capacity - trip.registeredCount);

  const finish = (outcome: RegistrationOutcome) =>
    router.replace(`/trip/registration-result/${trip.id}?outcome=${outcome}`);

  const confirm = async () => {
    setSaving(true);
    setFailed(false);
    try {
      const result = await register(trip.id, opId);
      if (result.alreadyRegistered) finish('already');
      else if (result.registration.participation === 'REGISTERED') finish('registered');
      // A retry of this visit's opId after that registration was cancelled (e.g. on another
      // device): the server created nothing, so never confirm a spot. Trip detail shows the truth.
      else leaveFlow(trip.id);
    } catch (error) {
      const reason = error instanceof ApiClientError ? error.details?.reason : undefined;
      if (reason === 'TRIP_FULL') finish('full');
      else if (reason === 'REGISTRATION_CLOSED') finish('closed');
      else {
        setFailed(true);
        setSaving(false);
      }
    }
  };

  return (
    <StatusLayout
      footer={
        <>
          <Button label="Confirm registration" onPress={() => void confirm()} loading={saving} />
          <Button
            label="Not now"
            variant="secondary"
            disabled={saving}
            onPress={() => leaveFlow(trip.id)}
          />
        </>
      }
    >
      <StatusHero
        chip="CONFIRM"
        tone="green"
        caption="Reserve your spot"
        title="Reserve your spot?"
        subtitle={`${trip.resortName} · ${formatShortDate(trip.startsAt, tz)} · ${formatCost(trip.costCents)} · ${spotsLeft} ${spotsLeft === 1 ? 'spot remains' : 'spots remain'}. Registering does not enable live sharing or chat.`}
      />
      {failed ? (
        <ErrorState
          variant="network"
          title="Your registration wasn't sent"
          message="Check your connection and try again. Trying again never registers you twice."
          actionLabel="Try again"
          onAction={() => void confirm()}
        />
      ) : null}
      <DetailCard
        title="Trip details"
        rows={[
          { label: 'Trip', value: trip.name },
          { label: 'Date', value: formatShortDate(trip.startsAt, tz) },
          { label: 'Price', value: formatCost(trip.costCents) },
        ]}
      />
      <DetailCard
        title="Registration note"
        note="Confirming reserves a spot. Location sharing and geofence chat remain disabled until active participation begins."
      />
    </StatusLayout>
  );
}

/** "Reserve your spot?" (SS-28, Figma catalog 10 page 33, Confirm). Route /trip/register/:tripId. */
export function RegisterConfirmScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { state, reload } = useTripDetail(tripId);
  return (
    <TripLoadGate state={state} onRetry={reload}>
      {(trip) => <ConfirmContent trip={trip} />}
    </TripLoadGate>
  );
}
