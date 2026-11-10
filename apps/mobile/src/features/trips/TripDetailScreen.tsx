import { ROLE_LABELS, type TripDetail } from '@snowsync/shared';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
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
  formatTimeRange,
  formatTripDateWithYear,
  spotsLeftText,
} from './tripFormat';
import { getTrip } from './tripsApi';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'failed'; reason: 'notFound' | 'network' | 'unknown' }
  | { kind: 'loaded'; trip: TripDetail };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Text variant="label" color="textMuted">
        {title.toUpperCase()}
      </Text>
      {children}
    </Card>
  );
}

//Trip detail (SS-148, Figma catalog 08). The trip phase and my own status are shown side by side never merged.
//The Register button arrives in Sprint 4: its place is the marked slot below.
export function TripDetailScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const canManage = useAuthStore(selectHasPermission('MANAGE_TRIPS'));
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

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

  //Reload whenever the screen comes back into view, e.g. after Trip management changed the trip.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (state.kind === 'loading') {
    return (
      <Screen>
        <LoadingSkeleton lines={4} accessibilityLabel="Loading trip" />
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
  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen options={{ title: trip.name }} />
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {trip.name}
        </Text>
        <View style={styles.badges}>
          <TripStateBadge state={trip.state} />
          <ParticipationBadge participation={trip.myParticipation} />
        </View>
      </View>
      <Section title="Date and time">
        <Text variant="bodyStrong">{formatTripDateWithYear(trip.startsAt, tz)}</Text>
        <Text color="textMuted">{formatTimeRange(trip.startsAt, trip.endsAt, tz)}</Text>
      </Section>
      <Section title="Resort and boundary">
        <Text variant="bodyStrong">{trip.resortName}</Text>
        <Text color="textMuted">
          {trip.geofence.label} · {trip.geofence.radiusMeters} m check-in boundary
        </Text>
      </Section>
      <Section title="Schedule">
        <Text>
          Registration: {formatDateTime(trip.registrationOpensAt, tz)} →{' '}
          {formatDateTime(trip.registrationClosesAt, tz)}
        </Text>
        <Text>
          Check-in window: {formatTimeRange(trip.checkInStartsAt, trip.sessionStartsAt, tz)}
        </Text>
        <Text>Active window: {formatTimeRange(trip.sessionStartsAt, trip.exitStartsAt, tz)}</Text>
      </Section>
      <Section title="Price and spots">
        <Text variant="bodyStrong">{formatCost(trip.costCents)} per member</Text>
        <Text color="textMuted">
          {spotsLeftText(trip.capacity, trip.registeredCount)} · {trip.registeredCount} of{' '}
          {trip.capacity} registered
        </Text>
      </Section>
      <Section title="Officers">
        {trip.officers.map((officer) => (
          <Text key={officer.id}>
            {officer.displayName} · {ROLE_LABELS[officer.role]}
          </Text>
        ))}
      </Section>
      {
        //SPRINT 4 SLOT: the Register / Cancel registration button (SS-35) will be implemented here
      }
      <View testID="register-slot">
        <Text variant="caption" color="textMuted">
          Registration from the app arrives in the next update.
        </Text>
      </View>
      {canManage ? (
        <Button
          label="Manage trip"
          variant="secondary"
          onPress={() => router.push(`/trip/manage/${trip.id}`)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
