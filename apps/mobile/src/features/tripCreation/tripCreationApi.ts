import type { CreateTripRequest, MemberSearchResult, TripDetail } from '@snowsync/shared';
import { authRequest } from '../../api/authClient';

/** GET /admin/members/search?q=… (officers): approved members for the initial roster. */
export function searchMembers(query: string): Promise<MemberSearchResult[]> {
  return authRequest<MemberSearchResult[]>(
    'GET',
    `/admin/members/search?q=${encodeURIComponent(query)}`,
  );
}

/** POST /trips (officers): saves the trip as CREATED. */
export function createTrip(request: CreateTripRequest): Promise<TripDetail> {
  return authRequest<TripDetail>('POST', '/trips', { body: request });
}
