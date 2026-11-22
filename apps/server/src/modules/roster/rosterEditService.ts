import { randomUUID } from 'node:crypto';
import {
  ATTENDANCE_STATES,
  RegistrationErrorReason,
  type RosterAddRequest,
  type RosterEntry,
  type TripState,
} from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { recordAudit } from '../../lib/auditLog';
import { HttpError } from '../../lib/httpError';
import { releaseTripCharge } from '../charges/chargeService';
import { participationTransaction } from '../participation/participationService';
import { addToTrip, lockTrip } from '../registration/registrationService';
import { loadRosterEntry } from './rosterQueryService';

//Trip states in which officers may change the roster (late adds are allowed until exit)
export const ROSTER_EDITABLE_STATES: readonly TripState[] = [
  'CREATED',
  'OPEN_FOR_REGISTRATION',
  'CHECK_IN',
  'ACTIVE',
];

function assertEditable(state: TripState): void {
  if (!ROSTER_EDITABLE_STATES.includes(state)) {
    throw new HttpError('CONFLICT', 'This trip has ended; its roster can no longer change.', {
      reason: 'TRIP_NOT_EDITABLE',
      tripState: state,
    });
  }
}

//POST /admin/trips/:tripId/roster (SS-80). Adds an approved member as REGISTERED for this trip only, through the same capacity path as self-registration. At capacity it refuses unless the
//officer sends allowOverCapacity. Adding someone already on the roster changes nothing.

export async function addRosterMember(
  actorId: string,
  tripId: string,
  input: RosterAddRequest,
): Promise<{ entry: RosterEntry; added: boolean }> {
  const member = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { membershipStatus: true },
  });
  if (member?.membershipStatus !== 'APPROVED') {
    throw new HttpError('VALIDATION_FAILED', 'Only approved club members can be added.', {
      reason: RegistrationErrorReason.MEMBER_NOT_APPROVED,
    });
  }
  return participationTransaction(async (tx, apply) => {
    const trip = await lockTrip(tx, tripId);
    assertEditable(trip.state);
    const added = await addToTrip(tx, apply, trip, {
      userId: input.userId,
      method: 'OFFICER',
      actorId,
      opId: randomUUID(),
      allowOverCapacity: input.allowOverCapacity,
    });
    if (added) {
      await recordAudit(
        {
          actorId,
          action: 'ROSTER_MEMBER_ADDED',
          targetType: 'TRIP',
          targetId: tripId,
          after: { userId: input.userId, allowOverCapacity: input.allowOverCapacity },
        },
        tx,
      );
    }
    return { entry: (await loadRosterEntry(tx, tripId, input.userId))!, added };
  });
}

//DELETE /admin/trips/:tripId/roster/:userId (SS-80). Releases a REGISTERED member's spot with a
//required reason. Payment history is kept: an unpaid charge is voided and a paid one goes to
//refund review. Members who are checked in or active can't be removed: that is an attendance
//decision (no-show, left early) so their participation history is never silently erased.
//Notifying the member arrives with notifications in Sprint 6.
export async function removeRosterMember(
  actorId: string,
  tripId: string,
  userId: string,
  reason: string,
): Promise<RosterEntry> {
  return participationTransaction(async (tx, apply) => {
    const trip = await lockTrip(tx, tripId);
    assertEditable(trip.state);
    const membership = await tx.tripMembership.findUnique({
      where: { tripId_userId: { tripId, userId } },
      select: { participation: true },
    });
    if (!membership || membership.participation === 'NOT_REGISTERED') {
      throw new HttpError('NOT_FOUND', "This member isn't on the roster.", {
        reason: RegistrationErrorReason.NOT_ON_ROSTER,
      });
    }
    if (ATTENDANCE_STATES.includes(membership.participation)) {
      throw new HttpError(
        'CONFLICT',
        'This member has already checked in. Use attendance actions instead of removing them.',
        {
          reason: RegistrationErrorReason.USE_ATTENDANCE_ACTIONS,
          participation: membership.participation,
        },
      );
    }
    if (membership.participation !== 'REGISTERED') {
      throw new HttpError('CONFLICT', "This member's attendance is already final.", {
        reason: RegistrationErrorReason.PARTICIPATION_NOT_ALLOWED,
        participation: membership.participation,
      });
    }
    await apply({
      tripId,
      userId,
      from: 'REGISTERED',
      to: 'NOT_REGISTERED',
      method: 'OFFICER',
      actorId,
      reason,
      opId: randomUUID(),
      set: { cancelledAt: new Date() },
    });
    const chargeStatus = await releaseTripCharge(tx, userId, tripId);
    await recordAudit(
      {
        actorId,
        action: 'ROSTER_MEMBER_REMOVED',
        targetType: 'TRIP',
        targetId: tripId,
        reason,
        before: { userId, participation: 'REGISTERED' },
        after: { userId, participation: 'NOT_REGISTERED', chargeStatus },
      },
      tx,
    );
    return (await loadRosterEntry(tx, tripId, userId))!;
  });
}
