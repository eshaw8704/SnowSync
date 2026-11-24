import type { TripDetail } from '@snowsync/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/Button';
import { DetailCard } from '../../components/DetailCard';
import { StatusHero } from '../../components/StatusHero';
import { StatusLayout } from '../../components/StatusLayout';
import { formatCost, formatDateTime, formatShortDate, formatTime } from '../trips/tripFormat';
import { parseOutcome, type RegistrationOutcome } from './registrationState';
import { TripLoadGate } from './TripLoadGate';
import { useTripDetail } from './useTripDetail';

/** Back to Trip detail, which sits under this screen in the stack. */
function viewTrip(tripId: string): void {
  if (router.canGoBack()) router.back();
  else router.replace(`/trip/${tripId}`);
}

function ResultContent({ trip, outcome }: { trip: TripDetail; outcome: RegistrationOutcome }) {
  const tz = trip.resortTimeZone;
  if (outcome === 'already') {
    return (
      <StatusLayout
        footer={<Button label="View registered trip" onPress={() => viewTrip(trip.id)} />}
      >
        <StatusHero
          chip="REGISTERED"
          tone="green"
          caption="Duplicate blocked"
          title="Your spot is saved."
          subtitle={`You are already registered for ${trip.resortName}. No duplicate reservation was created.`}
        />
        <DetailCard
          title="Trip details"
          rows={[
            { label: 'Trip', value: trip.name },
            { label: 'Date', value: formatShortDate(trip.startsAt, tz) },
            { label: 'Check-in', value: formatTime(trip.checkInStartsAt, tz) },
          ]}
        />
        <DetailCard
          title="Registration note"
          note="Your existing registration remains active. Use View registered trip to review trip details."
        />
      </StatusLayout>
    );
  }
  if (outcome === 'full') {
    return (
      <StatusLayout
        footer={<Button label="Browse available trips" onPress={() => router.replace('/trips')} />}
      >
        <StatusHero
          chip="FULL"
          tone="amber"
          caption="No reservation created"
          title="This trip is full"
          subtitle={`${trip.capacity} / ${trip.capacity} spots reserved. No reservation was created. Check another trip or ask an officer about availability.`}
        />
        <DetailCard
          title="Capacity"
          rows={[
            { label: 'Registered', value: String(trip.capacity) },
            { label: 'Remaining', value: '0' },
          ]}
        />
        <DetailCard
          title="Next step"
          note="Browse available trips to find another open reservation opportunity."
        />
      </StatusLayout>
    );
  }
  if (outcome === 'closed') {
    return (
      <StatusLayout footer={<Button label="See trip officers" onPress={() => viewTrip(trip.id)} />}>
        <StatusHero
          chip="CLOSED"
          tone="amber"
          caption="Registration ended"
          title="Registration has closed"
          subtitle={`${trip.resortName} registration ended ${formatDateTime(trip.registrationClosesAt, tz)}. Contact an officer; a late registration requires authorized roster management.`}
        />
        <DetailCard
          title="Registration window"
          rows={[
            { label: 'Ended', value: formatDateTime(trip.registrationClosesAt, tz) },
            { label: 'Late entry', value: 'Officer approval required' },
          ]}
        />
        <DetailCard
          title="Good to know"
          note="An officer can still add you to the roster if there's room."
        />
      </StatusLayout>
    );
  }
  return (
    <StatusLayout footer={<Button label="View my trip" onPress={() => viewTrip(trip.id)} />}>
      <StatusHero
        chip="REGISTERED"
        tone="green"
        caption="Confirmed"
        title={`See you at ${trip.resortName}.`}
        subtitle="Your spot is confirmed. You are registered for this trip."
      />
      <DetailCard
        title="Next steps"
        rows={[
          {
            label: 'Payment',
            value:
              trip.costCents > 0 ? `Pay ${formatCost(trip.costCents)} if required` : 'Free trip',
          },
          { label: 'Check-in', value: formatTime(trip.checkInStartsAt, tz) },
        ]}
      />
      <DetailCard
        title="Trip details"
        note={`${trip.resortName} — ${trip.geofence.label} · configured resort geofence`}
      />
    </StatusLayout>
  );
}

/**
 * Where registering ends up (SS-28, Figma catalog 10 pages 33–35): confirmed, already registered
 * (duplicate blocked), full or closed. Route /trip/registration-result/:tripId?outcome=…
 */
export function RegistrationResultScreen() {
  const { tripId, outcome } = useLocalSearchParams<{ tripId: string; outcome?: string }>();
  const { state, reload } = useTripDetail(tripId);
  return (
    <TripLoadGate state={state} onRetry={reload}>
      {(trip) => <ResultContent trip={trip} outcome={parseOutcome(outcome)} />}
    </TripLoadGate>
  );
}
