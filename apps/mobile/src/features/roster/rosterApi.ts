import type { RosterEntry, RosterResponse } from '@snowsync/shared';
import { authRequest } from '../../api/authClient';

const base = (tripId: string) => `/admin/trips/${encodeURIComponent(tripId)}`;

/** GET /admin/trips/:id/roster (officers): members, counts and the trip header. */
export function getRoster(tripId: string): Promise<RosterResponse> {
  return authRequest<RosterResponse>('GET', `${base(tripId)}/roster`);
}

/** POST /admin/trips/:id/roster. `allowOverCapacity` is the explicit over-capacity override. */
export function addRosterMember(
  tripId: string,
  userId: string,
  allowOverCapacity = false,
): Promise<RosterEntry> {
  return authRequest<RosterEntry>('POST', `${base(tripId)}/roster`, {
    body: { userId, allowOverCapacity },
  });
}

/** DELETE /admin/trips/:id/roster/:userId with the required reason. */
export function removeRosterMember(
  tripId: string,
  userId: string,
  reason: string,
): Promise<RosterEntry> {
  return authRequest<RosterEntry>(
    'DELETE',
    `${base(tripId)}/roster/${encodeURIComponent(userId)}`,
    { body: { reason } },
  );
}
