import {
  holdsSpot,
  RegistrationErrorReason,
  SPOT_HOLDING_STATES,
  type AttendanceMethod,
  type MyRegistration,
  type RegisterResult,
} from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/httpError';
import { isUniqueViolation } from '../../lib/prismaErrors';
import { createTripCharge, latestTripCharge } from '../charges/chargeService';
import {
  participationTransaction,
  type ApplyParticipationChange,
} from '../participation/participationService';

/** The trip columns registration needs, read while the trip's row is locked. */
export type LockedTrip = Prisma.TripGetPayload<{
  select: {
    id: true;
    state: true;
    capacity: true;
    costCents: true;
    registrationClosesAt: true;
    sessionStartsAt: true;
  };
}>;

/**
 * Locks the trip's row until the transaction ends (SELECT … FOR UPDATE), so registrations for the
 * same trip happen one at a time and two people can never take the last spot. Throws NOT_FOUND.
 */
export async function lockTrip(tx: Prisma.TransactionClient, tripId: string): Promise<LockedTrip> {
  await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId}::uuid FOR UPDATE`;
  const trip = await tx.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      state: true,
      capacity: true,
      costCents: true,
      registrationClosesAt: true,
      sessionStartsAt: true,
    },
  });
  if (!trip) {
    throw new HttpError('NOT_FOUND', "We can't find this trip.");
  }
  return trip;
}

/** How many spots are taken: everyone REGISTERED, CHECKED_IN or ACTIVE. */
export async function countSpotsTaken(
  client: Prisma.TransactionClient,
  tripId: string,
): Promise<number> {
  return client.tripMembership.count({
    where: { tripId, participation: { in: [...SPOT_HOLDING_STATES] } },
  });
}

/** The caller's own registration on one trip, as GET /trips/:tripId/registration returns it. */
export async function loadMyRegistration(
  client: Prisma.TransactionClient,
  tripId: string,
  userId: string,
): Promise<MyRegistration> {
  const [membership, charge, waitlist] = await Promise.all([
    client.tripMembership.findUnique({
      where: { tripId_userId: { tripId, userId } },
      select: {
        participation: true,
        checkedInAt: true,
        checkInMethod: true,
        lateMinutes: true,
        checkedInBy: { select: { displayName: true } },
      },
    }),
    latestTripCharge(client, userId, tripId),
    client.waitlistEntry.findUnique({
      where: { tripId_userId: { tripId, userId } },
      select: { status: true },
    }),
  ]);
  return {
    tripId,
    participation: membership?.participation ?? 'NOT_REGISTERED',
    chargeStatus: charge?.status ?? null,
    chargeAmountCents: charge?.amountCents ?? null,
    waitlisted: waitlist?.status === 'WAITING',
    checkedInAt: membership?.checkedInAt?.toISOString() ?? null,
    checkInMethod: membership?.checkInMethod ?? null,
    checkedInByName: membership?.checkedInBy?.displayName ?? null,
    lateMinutes: membership?.lateMinutes ?? null,
  };
}

/** One request to put a member on a trip: the member themselves or an officer. */
export interface AddToTripCommand {
  userId: string;
  method: Extract<AttendanceMethod, 'SELF' | 'OFFICER'>;
  actorId: string;
  opId: string;
  /** Officers only: add even when the trip is full (SS-80 explicit override). */
  allowOverCapacity?: boolean;
}

/**
 * Registers one member on a trip whose row the caller has locked with {@link lockTrip}: checks
 * capacity, moves participation to REGISTERED through the participation helper, creates the UNPAID
 * trip charge and converts a waiting waitlist entry. Returns false when nothing new is created:
 * the member already held a spot, or this opId was applied before (its charge was created then, so
 * a late retry after a cancellation never charges a member who is no longer registered).
 * Registration window checks are the caller's job, because officers may add people after
 * registration closes. Self-registration, roster add and waitlist convert all use this one path.
 */
export async function addToTrip(
  tx: Prisma.TransactionClient,
  apply: ApplyParticipationChange,
  trip: LockedTrip,
  command: AddToTripCommand,
): Promise<boolean> {
  const existing = await tx.tripMembership.findUnique({
    where: { tripId_userId: { tripId: trip.id, userId: command.userId } },
    select: { participation: true },
  });
  const from = existing?.participation ?? 'NOT_REGISTERED';
  if (holdsSpot(from)) {
    return false;
  }
  if (from !== 'NOT_REGISTERED') {
    throw new HttpError('CONFLICT', 'This member already has an attendance record for this trip.', {
      reason: RegistrationErrorReason.PARTICIPATION_NOT_ALLOWED,
      participation: from,
    });
  }
  const taken = await countSpotsTaken(tx, trip.id);
  if (taken >= trip.capacity && !command.allowOverCapacity) {
    throw new HttpError('CONFLICT', 'This trip is full.', {
      reason: RegistrationErrorReason.TRIP_FULL,
      capacity: trip.capacity,
    });
  }
  const result = await apply({
    tripId: trip.id,
    userId: command.userId,
    from,
    to: 'REGISTERED',
    method: command.method,
    actorId: command.actorId,
    opId: command.opId,
    set: { registeredAt: new Date(), registeredById: command.actorId, cancelledAt: null },
  });
  if (!result.applied || result.replayed) {
    return false;
  }
  await createTripCharge(tx, command.userId, trip);
  await tx.waitlistEntry.updateMany({
    where: { tripId: trip.id, userId: command.userId, status: 'WAITING' },
    data: { status: 'CONVERTED' },
  });
  return true;
}

/** True when members may register themselves right now. */
export function isRegistrationOpen(trip: LockedTrip, now = new Date()): boolean {
  return trip.state === 'OPEN_FOR_REGISTRATION' && now < trip.registrationClosesAt;
}

/**
 * The answer to a retried registration. Returns null when the opId is unused. When the opId is this
 * member's own self-registration on this trip, returns their registration as it is now, so a retry
 * that arrives after they cancelled reports NOT_REGISTERED with alreadyRegistered false. Throws
 * CONFLICT when the opId belongs to any other change, so a reused opId never reports a false
 * success. Checks the same fields as the participation helper's own replay check.
 */
async function replayRegistration(
  userId: string,
  tripId: string,
  opId: string,
): Promise<RegisterResult | null> {
  const seen = await prisma.attendanceEvent.findUnique({
    where: { opId },
    select: {
      fromState: true,
      toState: true,
      method: true,
      actorId: true,
      tripMembership: { select: { tripId: true, userId: true } },
    },
  });
  if (!seen) {
    return null;
  }
  if (
    seen.tripMembership.tripId !== tripId ||
    seen.tripMembership.userId !== userId ||
    seen.fromState !== 'NOT_REGISTERED' ||
    seen.toState !== 'REGISTERED' ||
    seen.method !== 'SELF' ||
    seen.actorId !== userId
  ) {
    throw new HttpError(
      'CONFLICT',
      'This operation ID belongs to a different participation change.',
      {
        reason: RegistrationErrorReason.PARTICIPATION_NOT_ALLOWED,
      },
    );
  }
  const registration = await loadMyRegistration(prisma, tripId, userId);
  return { registration, alreadyRegistered: holdsSpot(registration.participation) };
}

/**
 * POST /trips/:tripId/registration (SS-28). Only while the trip is OPEN_FOR_REGISTRATION and
 * before registration closes; capacity is checked under the trip's row lock. Registering twice, or
 * retrying with the same opId, returns the existing registration and creates nothing.
 */
export async function registerSelf(
  userId: string,
  tripId: string,
  opId: string,
): Promise<RegisterResult> {
  const replay = await replayRegistration(userId, tripId, opId);
  if (replay) {
    return replay;
  }
  try {
    return await participationTransaction(async (tx, apply) => {
      const trip = await lockTrip(tx, tripId);
      const existing = await tx.tripMembership.findUnique({
        where: { tripId_userId: { tripId, userId } },
        select: { participation: true },
      });
      if (existing && holdsSpot(existing.participation)) {
        return {
          registration: await loadMyRegistration(tx, tripId, userId),
          alreadyRegistered: true,
        };
      }
      if (!isRegistrationOpen(trip)) {
        throw new HttpError('CONFLICT', 'Registration for this trip is closed.', {
          reason: RegistrationErrorReason.REGISTRATION_CLOSED,
        });
      }
      const added = await addToTrip(tx, apply, trip, {
        userId,
        method: 'SELF',
        actorId: userId,
        opId,
      });
      const registration = await loadMyRegistration(tx, tripId, userId);
      return { registration, alreadyRegistered: !added && holdsSpot(registration.participation) };
    });
  } catch (error) {
    // The same opId arrived twice at once and the other request applied it first. It is a retry
    // only if that request registered this member on this trip; replayRegistration throws otherwise.
    if (isUniqueViolation(error)) {
      const replay = await replayRegistration(userId, tripId, opId);
      if (replay) {
        return replay;
      }
    }
    throw error;
  }
}
