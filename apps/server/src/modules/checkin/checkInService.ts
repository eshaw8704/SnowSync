import {
  RegistrationErrorReason,
  type OfficerCheckInRequest,
  type OfficerCheckInResult,
  type TripState,
} from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../lib/httpError';
import { isUniqueViolation } from '../../lib/prismaErrors';
import { participationTransaction } from '../participation/participationService';
import { lockTrip } from '../registration/registrationService';
import { loadRosterEntry } from '../roster/rosterQueryService';

//Trip states in which members can be checked in (System Map §07)
export const CHECK_IN_TRIP_STATES: readonly TripState[] = ['CHECK_IN', 'ACTIVE'];

//Whole minutes after the active session started, or null when on time. Lateness is an amber
//annotation on the check-in: never a state, an emergency or a no-show
export function minutesLate(sessionStartsAt: Date, now: Date): number | null {
  const minutes = Math.floor((now.getTime() - sessionStartsAt.getTime()) / 60_000);
  return minutes > 0 ? minutes : null;
}

async function existingResult(tripId: string, userId: string): Promise<OfficerCheckInResult> {
  const entry = await loadRosterEntry(prisma, tripId, userId);
  return { entry: entry!, alreadyCheckedIn: true };
}

//POST /admin/trips/:tripId/checkins (SS-33). An officer confirms a member is physically present:
//REGISTERED → CHECKED_IN with method OFFICER, the officer's id, the reason and the time. Only
//while the trip is in CHECK_IN or ACTIVE. A member who is already checked in (or active) gets
//their existing record back and nothing new is written; so does a retry with the same opId
export async function officerCheckIn(
  officerId: string,
  tripId: string,
  input: OfficerCheckInRequest,
  now: Date = new Date(),
): Promise<OfficerCheckInResult> {
  try {
    return await participationTransaction(async (tx, apply) => {
      const trip = await lockTrip(tx, tripId);
      const membership = await tx.tripMembership.findUnique({
        where: { tripId_userId: { tripId, userId: input.userId } },
        select: { participation: true },
      });
      if (!membership || membership.participation === 'NOT_REGISTERED') {
        throw new HttpError('NOT_FOUND', "This member isn't on the roster.", {
          reason: RegistrationErrorReason.NOT_ON_ROSTER,
        });
      }
      if (membership.participation === 'CHECKED_IN' || membership.participation === 'ACTIVE') {
        return {
          entry: (await loadRosterEntry(tx, tripId, input.userId))!,
          alreadyCheckedIn: true,
        };
      }
      if (!CHECK_IN_TRIP_STATES.includes(trip.state)) {
        throw new HttpError('CONFLICT', "Check-in isn't open for this trip.", {
          reason: RegistrationErrorReason.CHECK_IN_NOT_OPEN,
          tripState: trip.state,
        });
      }
      if (membership.participation !== 'REGISTERED') {
        throw new HttpError('CONFLICT', "This member's attendance is already final.", {
          reason: RegistrationErrorReason.PARTICIPATION_NOT_ALLOWED,
          participation: membership.participation,
        });
      }
      const lateMinutes = minutesLate(trip.sessionStartsAt, now);
      const result = await apply({
        tripId,
        userId: input.userId,
        from: 'REGISTERED',
        to: 'CHECKED_IN',
        method: 'OFFICER',
        actorId: officerId,
        reason: input.reason,
        lateMinutes,
        opId: input.opId,
        set: { checkedInAt: now, checkInMethod: 'OFFICER', checkedInById: officerId, lateMinutes },
      });
      return {
        entry: (await loadRosterEntry(tx, tripId, input.userId))!,
        alreadyCheckedIn: result.replayed,
      };
    });
  } catch (error) {
    // The same opId arrived twice at once and the other request already checked them in.
    if (isUniqueViolation(error)) {
      return existingResult(tripId, input.userId);
    }
    throw error;
  }
}
