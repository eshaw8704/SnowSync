import type { TripDetail, TripState } from '@snowsync/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { ParticipationBadge } from '../../components/ParticipationBadge';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { TripStateBadge } from '../../components/TripStateBadge';
import { selectHasPermission, useAuthStore } from '../../state/authStore';
import { spacing } from '../../theme';
import {
  formatCost,
  formatDateTime,
  formatTime,
  formatTimeRange,
  formatTripDate,
} from '../trips/tripFormat';
import { getTrip } from '../trips/tripsApi';
import { DeleteTripControl } from './DeleteTripControl';
import { LifecycleActions } from './LifecycleActions';

/** The configuration can be edited until the trip goes ACTIVE (same rule as the server). */
export const EDITABLE_STATES: TripState[] = ['CREATED', 'OPEN_FOR_REGISTRATION', 'CHECK_IN'];

type LoadState =
  | { kind: 'loading' }
  | { kind: 'failed'; reason: 'notFound' | 'network' | 'unknown' }
  | { kind: 'loaded'; trip: TripDetail };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

/**
 * Officer trip management configuration, registration schedule,
 * lifecycle and geofence, roster count, and "Edit configuration" until the trip goes ACTIVE.
 */
export function TripManagementScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const canManage = useAuthStore(selectHasPermission('MANAGE_TRIPS'));
  const canManageRoster = useAuthStore(selectHasPermission('MANAGE_ROSTER'));
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [notice, setNotice] = useState<string>();

  const load = useCallback(() => {
    getTrip(tripId).then(
      (trip) => setState({ kind: 'loaded', trip }),
      (error: unknown) => {
        const code = error instanceof ApiClientError ? error.code : null;
        setState({
          kind: 'failed',
          reason:
            code === 'NOT_FOUND'
              ? 'notFound'
              : code === 'NETWORK_ERROR' || code === 'TIMEOUT'
                ? 'network'
                : 'unknown',
        });
      },
    );
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      if (canManage) load();
    }, [canManage, load]),
  );

  if (!canManage) {
    return (
      <Screen>
        <ErrorState
          variant="forbidden"
          message="Only officers who manage trips can open trip management."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }
  if (state.kind === 'loading') {
    return (
      <Screen>
        <LoadingSkeleton lines={4} accessibilityLabel="Loading trip management" />
      </Screen>
    );
  }
  if (state.kind === 'failed') {
    return (
      <Screen>
        {state.reason === 'notFound' ? (
          <ErrorState variant="notFound" onAction={() => router.back()} />
        ) : (
          <ErrorState
            variant={state.reason}
            actionLabel="Try again"
            onAction={() => {
              setState({ kind: 'loading' });
              load();
            }}
          />
        )}
      </Screen>
    );
  }

  const { trip } = state;
  const tz = trip.resortTimeZone;
  const onChanged = (message?: string) => {
    setNotice(message);
    load();
  };
  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.badges}>
          <TripStateBadge state={trip.state} />
          {trip.state !== 'CREATED' ? (
            <ParticipationBadge participation={trip.myParticipation} />
          ) : null}
        </View>
        <Text variant="title" accessibilityRole="header">
          {trip.name}
        </Text>
        <Text color="textMuted">
          {formatTripDate(trip.startsAt, tz)} · {formatTimeRange(trip.startsAt, trip.endsAt, tz)} ·{' '}
          {formatCost(trip.costCents)}
        </Text>
      </View>
      {notice ? (
        <Card>
          <Text color="brandGreen">{notice}</Text>
        </Card>
      ) : null}
      <Card>
        <Row
          label="Trip configuration"
          value={`${formatTripDate(trip.startsAt, tz)} · ${formatTimeRange(trip.startsAt, trip.endsAt, tz)} · ${formatCost(trip.costCents)} · ${trip.capacity} capacity`}
        />
        <Row
          label="Registration schedule"
          value={`${formatDateTime(trip.registrationOpensAt, tz)} → ${formatDateTime(trip.registrationClosesAt, tz)}`}
        />
        <Row
          label="Lifecycle & geofence"
          value={`Check-in ${formatTime(trip.checkInStartsAt, tz)} · Active ${formatTime(trip.sessionStartsAt, tz)} · Ending ${formatTime(trip.exitStartsAt, tz)} · ${trip.geofence.radiusMeters} m ${trip.geofence.label}`}
        />
        <Row label="Roster" value={`${trip.registeredCount} of ${trip.capacity} registered`} />
      </Card>
      {canManageRoster ? (
        <Button
          label="View roster"
          variant="secondary"
          onPress={() => router.push(`/trip/roster/${trip.id}`)}
        />
      ) : null}
      <LifecycleActions trip={trip} onChanged={onChanged} />
      {EDITABLE_STATES.includes(trip.state) ? (
        <Button
          label="Edit configuration"
          variant="secondary"
          onPress={() => router.push(`/trip/edit/${trip.id}`)}
        />
      ) : (
        <Text variant="caption" color="textMuted">
          This trip is active or over, so its configuration can no longer be edited.
        </Text>
      )}
      <DeleteTripControl trip={trip} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { gap: 2, paddingVertical: spacing.xs },
});
