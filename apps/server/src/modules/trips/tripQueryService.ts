import type { TripDetail, TripListScope, TripState, TripSummary, UserRole } from '@snowsync/shared';
import { HttpError } from '../../lib/httpError';
import { roleHasPermission } from '../permissions/permissionService';
import { loadTripDetail, loadTripSummaries } from './tripReadModel';

//Trips members can see: everything from registration opening onward.
const PUBLISHED: TripState[] = [
  'OPEN_FOR_REGISTRATION',
  'CHECK_IN',
  'ACTIVE',
  'EXIT',
  'COMPLETED',
  'CANCELLED',
];
//Published and not over yet.
const UPCOMING_OR_LIVE: TripState[] = ['OPEN_FOR_REGISTRATION', 'CHECK_IN', 'ACTIVE', 'EXIT'];
const PAST: TripState[] = ['COMPLETED', 'CANCELLED'];

// Officers (anyone whose role currently has MANAGE_TRIPS) also see CREATED trips
export function canSeeCreatedTrips(role: UserRole): Promise<boolean> {
  return roleHasPermission(role, 'MANAGE_TRIPS');
}

//GET /trips?scope= available: published, not over, and I am not on it
//mine: trips I have a membership on that are not over (officers also see CREATED ones)
//past: COMPLETED or CANCELLED trips that had been published
//created: CREATED trips (officers only)
export async function listTrips(
  viewerId: string,
  role: UserRole,
  scope: TripListScope,
): Promise<TripSummary[]> {
  const officer = await canSeeCreatedTrips(role);
  const notMine = {
    memberships: { none: { userId: viewerId, participation: { not: 'NOT_REGISTERED' as const } } },
  };
  const mine = {
    memberships: { some: { userId: viewerId, participation: { not: 'NOT_REGISTERED' as const } } },
  };
  switch (scope) {
    case 'available':
      return loadTripSummaries(viewerId, { state: { in: UPCOMING_OR_LIVE }, ...notMine });
    case 'mine':
      return loadTripSummaries(viewerId, {
        state: { in: officer ? ['CREATED', ...UPCOMING_OR_LIVE] : UPCOMING_OR_LIVE },
        ...mine,
      });
    case 'past':
      return loadTripSummaries(
        viewerId,
        {
          state: { in: PAST },
          // A trip cancelled before it was ever published was never visible to members.
          NOT: { transitions: { some: { fromState: 'CREATED', toState: 'CANCELLED' } } },
        },
        { startsAt: 'desc' },
      );
    case 'created':
      if (!officer) {
        throw new HttpError('FORBIDDEN', "You don't have permission to do this.", {
          permission: 'MANAGE_TRIPS',
        });
      }
      return loadTripSummaries(viewerId, { state: 'CREATED' });
  }
}

//GET /trips/:id. A CREATED trip is "not found" for anyone who cannot manage trips.
export async function getTrip(
  viewerId: string,
  role: UserRole,
  tripId: string,
): Promise<TripDetail> {
  const trip = await loadTripDetail(tripId, viewerId);
  if (!trip || (!PUBLISHED.includes(trip.state) && !(await canSeeCreatedTrips(role)))) {
    throw new HttpError('NOT_FOUND', "We can't find this trip.");
  }
  return trip;
}
