import type { TripDetail } from '@snowsync/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { DetailCard } from '../../components/DetailCard';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import { StatusHero } from '../../components/StatusHero';
import { StatusLayout } from '../../components/StatusLayout';
import { formatCost, formatDateTime, formatShortDate, formatTime } from '../trips/tripFormat';
import { getMyRegistration } from './registrationApi';
import { canRegisterAgain, parseOutcome, type RegistrationOutcome } from './registrationState';
import { TripLoadGate } from './TripLoadGate';
import { useTripDetail } from './useTripDetail';

type VerificationState = 'loading' | 'confirmed' | 'unconfirmed' | 'failed';

/** Back to Trip detail, which sits under this screen in the stack. */
function viewTrip(tripId: string): void {
  if (router.canGoBack()) router.back();
  else router.replace(`/trip/${tripId}`);
}

function ResultContent({ trip, outcome }: { trip: TripDetail; outcome: RegistrationOutcome }) {
  const tz = trip.resortTimeZone;

  if (outcome === 'cancelled') {
    return (
      <StatusLayout
        footer={<Button label="Back to available trips" onPress={() => router.replace('/trips')} />}
      >
        <StatusHero
          chip="CANCELLED"
          tone="red"
          caption="Spot released"
          title="Registration cancelled"
          subtitle={`You're no longer registered for ${trip.resortName}. The trip is still open for other members.`}
        />
        <DetailCard
          title="Payment review"
          rows={[
            { label: 'Refund', value: 'Contact treasurer' },
            { label: 'Policy', value: 'Club rules apply' },
          ]}
        />
        <DetailCard
          title="Trip remains open"
          note={
            canRegisterAgain(trip)
              ? 'You can register again while spots remain. Nothing was refunded automatically.'
              : "Registration has closed, so you can't register again yourself. Nothing was refunded automatically."
          }
        />
      </StatusLayout>
    );
  }

  if (outcome === 'already') {
    return (
      <StatusLayout
        footer={
          <>
            <Button label="View registered trip" onPress={() => viewTrip(trip.id)} />
            {trip.state === 'OPEN_FOR_REGISTRATION' ? (
              <Button
                label="Cancel registration"
                variant="secondary"
                onPress={() => router.replace(`/trip/cancel-registration/${trip.id}`)}
              />
            ) : null}
          </>
        }
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
          subtitle={`${trip.registeredCount} / ${trip.capacity} spots reserved. No reservation was created. Check another trip or ask an officer about availability.`}
        />
        <DetailCard
          title="Capacity"
          rows={[
            { label: 'Registered', value: String(trip.registeredCount) },
            {
              label: 'Remaining',
              value: String(Math.max(0, trip.capacity - trip.registeredCount)),
            },
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

/** Checks the current member's registration before displaying a success result. */
function VerifiedResult({ trip, outcome }: { trip: TripDetail; outcome: RegistrationOutcome }) {
  const [verification, setVerification] = useState<VerificationState>('loading');
  const latestRequest = useRef(0);

  const verify = useCallback(() => {
    const requestId = ++latestRequest.current;
    setVerification('loading');

    getMyRegistration(trip.id).then(
      (registration) => {
        if (requestId !== latestRequest.current) return;

        const confirmed = ['REGISTERED', 'CHECKED_IN', 'ACTIVE'].includes(
          registration.participation,
        );

        setVerification(confirmed ? 'confirmed' : 'unconfirmed');
      },
      () => {
        if (requestId === latestRequest.current) {
          setVerification('failed');
        }
      },
    );
  }, [trip.id]);

  useEffect(() => {
    const requestId = ++latestRequest.current;

    getMyRegistration(trip.id).then(
      (registration) => {
        if (requestId !== latestRequest.current) return;

        const confirmed = ['REGISTERED', 'CHECKED_IN', 'ACTIVE'].includes(
          registration.participation,
        );

        setVerification(confirmed ? 'confirmed' : 'unconfirmed');
      },
      () => {
        if (requestId === latestRequest.current) {
          setVerification('failed');
        }
      },
    );

    const requestRef = latestRequest;

    return () => {
      if (requestRef.current === requestId) {
        requestRef.current++;
      }
    };
  }, [trip.id]);

  if (verification === 'loading') {
    return (
      <Screen edges={['bottom']}>
        <LoadingSkeleton lines={4} accessibilityLabel="Verifying registration" />
      </Screen>
    );
  }

  if (verification === 'failed') {
    return (
      <StatusLayout footer={<Button label="Try again" onPress={verify} />}>
        <StatusHero
          chip="UNKNOWN"
          tone="amber"
          caption="Registration verification failed"
          title="Unable to confirm registration"
          subtitle="We couldn't check your registration status. Please try again."
        />
      </StatusLayout>
    );
  }

  if (verification === 'unconfirmed') {
    return (
      <StatusLayout
        footer={<Button label="View trip" onPress={() => router.replace(`/trip/${trip.id}`)} />}
      >
        <StatusHero
          chip="UNKNOWN"
          tone="amber"
          caption="Registration status unavailable"
          title="Unable to confirm registration"
          subtitle="Your registration could not be confirmed. Check your trip details for your current status."
        />
      </StatusLayout>
    );
  }

  return <ResultContent trip={trip} outcome={outcome} />;
}

/**
 * Where registering ends up (SS-28, Figma catalog 10 pages 33–35): confirmed, already registered
 * (duplicate blocked), full, closed, or cancelled (SS-31). Route
 * /trip/registration-result/:tripId?outcome=…
 */
export function RegistrationResultScreen() {
  const { tripId, outcome } = useLocalSearchParams<{ tripId: string; outcome?: string }>();
  const { state, reload } = useTripDetail(tripId);
  const parsedOutcome = parseOutcome(outcome);

  return (
    <TripLoadGate state={state} onRetry={reload}>
      {(trip) =>
        parsedOutcome === null ? (
          <StatusLayout
            footer={<Button label="View trip" onPress={() => router.replace(`/trip/${trip.id}`)} />}
          >
            <StatusHero
              chip="UNKNOWN"
              tone="amber"
              caption="Registration status unavailable"
              title="Unable to confirm registration"
              subtitle="We couldn't determine the registration result. Check your trip details to see your current status."
            />
          </StatusLayout>
        ) : parsedOutcome === 'registered' || parsedOutcome === 'already' ? (
          <VerifiedResult trip={trip} outcome={parsedOutcome} />
        ) : (
          <ResultContent trip={trip} outcome={parsedOutcome} />
        )
      }
    </TripLoadGate>
  );
}
