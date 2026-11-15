import type { TripSummary } from '@snowsync/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { useAuthStore } from '../../state/authStore';
import { listTrips } from '../trips/tripsApi';
import { HomeTripCard } from './HomeTripCard';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'failed'; offline: boolean }
  | { kind: 'loaded'; trips: TripSummary[] };

//Home: every trip I am part of that is not over, each as its own card,
//so two trips in different phases never merge. With none, "No upcoming trips" and Browse trips
export function HomeScreen() {
  const firstName = useAuthStore((state) => state.user?.displayName.split(' ')[0] ?? '');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  //Only the newest request may update the screen, so a slow earlier response cannot replace a
  //newer list.
  const latestRequest = useRef(0);

  const load = useCallback(() => {
    const requestId = ++latestRequest.current;
    listTrips('mine').then(
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

  //Reload whenever Home comes back into view (a trip may have changed phase meanwhile).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  let body;
  if (state.kind === 'loading') {
    body = <LoadingSkeleton lines={3} accessibilityLabel="Loading your trips" />;
  } else if (state.kind === 'failed') {
    body = (
      <ErrorState
        variant={state.offline ? 'network' : 'unknown'}
        title="We couldn't load your trips"
        actionLabel="Try again"
        onAction={() => {
          setState({ kind: 'loading' });
          load();
        }}
      />
    );
  } else if (state.trips.length === 0) {
    body = (
      <EmptyState
        title="No upcoming trips"
        subtitle="A little downtime before the next mountain day."
        message="No upcoming trips. Officers will announce the next trip here."
        actionLabel="Browse trips"
        onAction={() => router.push('/trips')}
        icon="image-filter-hdr"
      />
    );
  } else {
    body = state.trips.map((trip) => (
      <HomeTripCard key={trip.id} trip={trip} onOpen={() => router.push(`/trip/${trip.id}`)} />
    ));
  }

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        {firstName ? `Hey, ${firstName}` : 'Welcome back'}
      </Text>
      <Text color="textMuted">Your next mountain day starts here.</Text>
      {body}
    </Screen>
  );
}
