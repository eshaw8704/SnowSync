import type { TripDetail } from '@snowsync/shared';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import type { TripLoad } from './useTripDetail';

/** Props for {@link TripLoadGate}. */
export interface TripLoadGateProps {
  state: TripLoad;
  onRetry: () => void;
  children: (trip: TripDetail) => ReactNode;
}

/** Shows loading and error states for a flow screen, and the screen itself once the trip loaded. */
export function TripLoadGate({ state, onRetry, children }: TripLoadGateProps) {
  if (state.kind === 'loading') {
    return (
      <Screen edges={['bottom']}>
        <LoadingSkeleton lines={4} accessibilityLabel="Loading trip" />
      </Screen>
    );
  }
  if (state.kind === 'failed') {
    return (
      <Screen edges={['bottom']}>
        {state.reason === 'notFound' ? (
          <ErrorState variant="notFound" onAction={() => router.replace('/trips')} />
        ) : (
          <ErrorState variant={state.reason} actionLabel="Try again" onAction={onRetry} />
        )}
      </Screen>
    );
  }
  return <>{children(state.trip)}</>;
}
