import type { TripDetail, TripListScope, TripSummary } from '@snowsync/shared';
import { authRequest } from '../../api/authClient';

//GET /trips?scope=… : available, mine, past, or created (officers).
export function listTrips(scope: TripListScope): Promise<TripSummary[]> {
  return authRequest<TripSummary[]>('GET', `/trips?scope=${scope}`);
}

//GET /trips/:id
export function getTrip(tripId: string): Promise<TripDetail> {
  return authRequest<TripDetail>('GET', `/trips/${encodeURIComponent(tripId)}`);
}
