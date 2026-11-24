import type { ChargeStatus, MyRegistration, TripDetail } from '@snowsync/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { DetailCard, type DetailRow } from '../../components/DetailCard';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Text } from '../../components/Text';
import { spacing } from '../../theme';
import { formatCost, formatDateTime, formatTime, spotsLeftText } from '../trips/tripFormat';
import { getMyRegistration } from './registrationApi';
import { panelView } from './registrationState';

/** What a charge status is called on the member's screens. */
export const CHARGE_LABELS: Record<ChargeStatus, string> = {
  UNPAID: 'Unpaid',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  OVERDUE: 'Overdue',
  VOID: 'No charge',
  REFUND_REVIEW: 'Refund under review',
  REFUNDED: 'Refunded',
  NOT_REFUNDED: 'Not refunded',
};

type LoadState =
  { kind: 'loading' } | { kind: 'failed' } | { kind: 'loaded'; registration: MyRegistration };

/** Payment row: "Unpaid · $50", or "Free trip" when there is no charge. */
function paymentRow(registration: MyRegistration): DetailRow {
  if (registration.chargeStatus === null || registration.chargeAmountCents === null) {
    return { label: 'Payment', value: 'Free trip' };
  }
  return {
    label: 'Payment',
    value: `${CHARGE_LABELS[registration.chargeStatus]} · ${formatCost(registration.chargeAmountCents)}`,
  };
}

/** Props for {@link RegistrationPanel}. */
export interface RegistrationPanelProps {
  trip: TripDetail;
}

/**
 * My registration on Trip detail (SS-28, Figma catalog 10 pages 32–35): Register when spots are
 * open, the full and closed states, my registration with its payment status, and how and when I
 * was checked in (SS-33). Reloads whenever Trip detail comes back into view.
 */
export function RegistrationPanel({ trip }: RegistrationPanelProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const latestRequest = useRef(0);

  const load = useCallback(() => {
    const requestId = ++latestRequest.current;
    getMyRegistration(trip.id).then(
      (registration) => {
        if (requestId === latestRequest.current) setState({ kind: 'loaded', registration });
      },
      () => {
        if (requestId === latestRequest.current) setState({ kind: 'failed' });
      },
    );
  }, [trip.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (state.kind === 'loading') {
    return (
      <LoadingSkeleton lines={2} showBlock={false} accessibilityLabel="Loading registration" />
    );
  }
  if (state.kind === 'failed') {
    return (
      <View style={styles.panel} testID="registration-panel">
        <Text color="textMuted">We couldn&apos;t load your registration.</Text>
        <Button
          label="Try again"
          variant="secondary"
          onPress={() => {
            setState({ kind: 'loading' });
            load();
          }}
        />
      </View>
    );
  }

  const { registration } = state;
  const tz = trip.resortTimeZone;

  const view = panelView(trip, registration);

  return (
    <View style={styles.panel} testID="registration-panel">
      {view === 'open' ? (
        <>
          <DetailCard
            title="Registration note"
            note="Registering reserves a spot. Location sharing and chat remain disabled until active participation begins."
          />
          <Button
            label="Register for trip"
            accessibilityHint={spotsLeftText(trip.capacity, trip.registeredCount)}
            onPress={() => router.push(`/trip/register/${trip.id}`)}
          />
        </>
      ) : null}
      {view === 'full' ? (
        <DetailCard
          title="This trip is full"
          rows={[
            { label: 'Registered', value: String(trip.registeredCount) },
            { label: 'Remaining', value: '0' },
          ]}
          note="Check another trip or ask an officer about availability."
        />
      ) : null}
      {view === 'closed' ? (
        <DetailCard
          title="Registration has closed"
          rows={[
            { label: 'Ended', value: formatDateTime(trip.registrationClosesAt, tz) },
            { label: 'Late entry', value: 'Officer approval required' },
          ]}
          note="An officer can still add you to the roster if there's room."
        />
      ) : null}
      {view === 'notYetOpen' ? (
        <DetailCard
          title="Registration hasn't opened"
          rows={[{ label: 'Opens', value: formatDateTime(trip.registrationOpensAt, tz) }]}
        />
      ) : null}
      {view === 'registered' ? (
        <DetailCard
          title="You're registered"
          rows={[
            paymentRow(registration),
            { label: 'Check-in', value: formatTime(trip.checkInStartsAt, tz) },
          ]}
          note="Your spot is saved. Location sharing and chat stay off until the active session begins."
        />
      ) : null}
      {view === 'checkedIn' && registration.checkedInAt ? (
        <DetailCard
          title={registration.participation === 'ACTIVE' ? "You're active" : "You're checked in"}
          rows={[
            { label: 'Checked in', value: formatTime(registration.checkedInAt, tz) },
            registration.checkInMethod === 'OFFICER'
              ? { label: 'Verified by', value: registration.checkedInByName ?? 'An officer' }
              : {
                  // The member checked in on their phone (SELF) or the geofence did it (GEOFENCE).
                  label: 'Method',
                  value: registration.checkInMethod === 'SELF' ? 'Self check-in' : 'Automatic',
                },
            ...(registration.lateMinutes
              ? [
                  {
                    label: 'Arrival',
                    value: `Late · ${registration.lateMinutes} min`,
                    valueColor: 'late' as const,
                  },
                ]
              : []),
            paymentRow(registration),
          ]}
        />
      ) : null}
      {view === 'final' ? (
        <DetailCard
          title="Your trip is finished"
          rows={[paymentRow(registration)]}
          note="Attendance for this trip is final."
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md },
});
