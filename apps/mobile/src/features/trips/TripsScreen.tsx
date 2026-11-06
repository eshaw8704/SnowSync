import type { TripListScope, TripSummary } from '@snowsync/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { EmptyState, type EmptyStateProps } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { selectHasPermission, useAuthStore } from '../../state/authStore';
import { colors, radii, sizes, spacing } from '../../theme';
import { TripListCard } from './TripListCard';
import { listTrips } from './tripsApi';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'failed'; offline: boolean }
  | { kind: 'loaded'; trips: TripSummary[] };

const SCOPE_LABELS: Record<TripListScope, string> = {
  available: 'Available',
  mine: 'My trips',
  past: 'Past',
  created: 'Created',
};

//The Trips tab (SS-41, Figma catalog 08): Available, My trips and Past, plus Created and a
//"Create trip" button for officers with MANAGE_TRIPS. Every group has loading, empty and error states.
export function TripsScreen() {
  const isOfficer = useAuthStore(selectHasPermission('MANAGE_TRIPS'));
  const scopes: TripListScope[] = isOfficer
    ? ['available', 'mine', 'past', 'created']
    : ['available', 'mine', 'past'];
  const [scope, setScope] = useState<TripListScope>('available');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  //Only the newest request may update the screen, so a slow earlier response cannot overwrite the
  //group that is selected now.
  const latestRequest = useRef(0);

  const load = useCallback((next: TripListScope) => {
    const requestId = ++latestRequest.current;
    listTrips(next).then(
      (trips) => {
        if (requestId === latestRequest.current) setState({ kind: 'loaded', trips });
      },
      (error: unknown) => {
        if (requestId !== latestRequest.current) return;
        setState({
          kind: 'failed',
          offline:
            error instanceof ApiClientError &&
            (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT'),
        });
      },
    );
  }, []);

  // Reload whenever the tab comes back into view, so a trip created, edited or deleted elsewhere
  // shows up here straight away.
  useFocusEffect(
    useCallback(() => {
      load(scope);
    }, [load, scope]),
  );

  const choose = (next: TripListScope) => {
    if (next === scope) return;
    setState({ kind: 'loading' });
    setScope(next);
  };

  /** Catalog 32 empty-state copy, one per group. */
  const empty: Record<TripListScope, EmptyStateProps> = {
    available: {
      title: 'No trips open',
      subtitle: 'Club announcements',
      statusLabel: 'Closed',
      message:
        "Officers haven't opened any new trips yet. Check club announcements for the next resort day.",
      actionLabel: 'View announcements',
      onAction: () => router.push('/inbox'),
    },
    mine: {
      title: 'No registrations yet',
      subtitle: 'Membership alone is not enough',
      statusLabel: 'Open',
      message:
        "You haven't reserved a trip yet. Approved membership doesn't automatically register you for trips.",
      actionLabel: 'Browse available trips',
      onAction: () => choose('available'),
    },
    past: {
      title: 'History is empty',
      subtitle: 'After your first trip',
      statusLabel: 'Waiting',
      message: 'Your trip history will appear after your first club mountain day.',
      actionLabel: 'Browse upcoming trips',
      onAction: () => choose('available'),
    },
    created: {
      title: 'No created trips',
      subtitle: 'Drafts stay here',
      statusLabel: 'Created',
      message: 'Trips you create stay here, invisible to members, until registration opens.',
      actionLabel: 'Create trip',
      onAction: () => router.push('/trip/create'),
    },
  };

  let body;
  if (state.kind === 'loading') {
    body = <LoadingSkeleton lines={3} accessibilityLabel="Loading trips" />;
  } else if (state.kind === 'failed') {
    body = (
      <ErrorState
        variant={state.offline ? 'network' : 'unknown'}
        title="We couldn't load trips"
        actionLabel="Try again"
        onAction={() => {
          setState({ kind: 'loading' });
          load(scope);
        }}
      />
    );
  } else if (state.trips.length === 0) {
    body = <EmptyState {...empty[scope]} icon="image-filter-hdr" />;
  } else {
    body = (
      <>
        <Text variant="caption" color="textMuted">
          {state.trips.length} {state.trips.length === 1 ? 'trip' : 'trips'} · {SCOPE_LABELS[scope]}
        </Text>
        {state.trips.map((trip) => (
          <TripListCard key={trip.id} trip={trip} onOpen={() => router.push(`/trip/${trip.id}`)} />
        ))}
      </>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Find your next trip
      </Text>
      {isOfficer ? (
        <Button label="Create trip" onPress={() => router.push('/trip/create')} />
      ) : null}
      <View style={styles.tabs} accessibilityRole="tablist">
        {scopes.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: option === scope }}
            onPress={() => choose(option)}
            style={[styles.tab, option === scope && styles.tabSelected]}
          >
            <Text variant="label" color={option === scope ? 'textOnBrand' : 'textPrimary'}>
              {SCOPE_LABELS[option]}
            </Text>
          </Pressable>
        ))}
      </View>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tab: {
    flexGrow: 1,
    flexBasis: '40%',
    minHeight: sizes.minTouchTargetAndroid,
    borderRadius: radii.field,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  tabSelected: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
});
