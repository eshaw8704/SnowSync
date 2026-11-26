import type { TripDetail } from '@snowsync/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { getTrip } from '../trips/tripsApi';

/** Loading state of one trip for the registration flow screens. */
export type TripLoad =
  | { kind: 'loading' }
  | { kind: 'failed'; reason: 'notFound' | 'network' | 'unknown' }
  | { kind: 'loaded'; trip: TripDetail };

/** Loads GET /trips/:id once; `reload` tries again. Only the newest response is used. */
export function useTripDetail(tripId: string): { state: TripLoad; reload: () => void } {
  const [state, setState] = useState<TripLoad>({ kind: 'loading' });
  const latest = useRef(0);
  const load = useCallback(() => {
    const requestId = ++latest.current;
    getTrip(tripId).then(
      (trip) => {
        if (requestId === latest.current) setState({ kind: 'loaded', trip });
      },
      (error: unknown) => {
        if (requestId !== latest.current) return;
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
  useEffect(load, [load]);
  const reload = useCallback(() => {
    setState({ kind: 'loading' });
    load();
  }, [load]);
  return { state, reload };
}
