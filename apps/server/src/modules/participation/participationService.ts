import {
  canChangeParticipation,
  RegistrationErrorReason,
  type AttendanceMethod,
  type CheckInMethod,
  type ParticipationState,
} from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';
import { domainEvents, type ParticipationChanged } from '../../lib/domainEvents';
import { HttpError } from '../../lib/httpError';

/** How long a participation transaction may wait for a connection and run, in milliseconds. */
const TRANSACTION_WAIT_MS = 15_000;

/** Membership columns a change may set together with the new participation. */
export interface MembershipFields {
  registeredAt?: Date;
  registeredById?: string | null;
  checkedInAt?: Date | null;
  checkInMethod?: CheckInMethod | null;
  checkedInById?: string | null;
  lateMinutes?: number | null;
  cancelledAt?: Date | null;
}

/** One request to move one member's participation on one trip. */
export interface ParticipationChange {
  tripId: string;
  userId: string;
  from: ParticipationState;
  to: ParticipationState;
  method: AttendanceMethod;
  actorId: string | null;
  reason?: string | null;
  lateMinutes?: number | null;
  opId: string;
  set?: MembershipFields;
}

export interface ParticipationChangeResult {
  applied: boolean;
  replayed: boolean;
  membershipId: string | null;
  participation: ParticipationState;
  version: number;
}

export type ApplyParticipationChange = (
  change: ParticipationChange,
) => Promise<ParticipationChangeResult>;

async function replayIfSeen(
  tx: Prisma.TransactionClient,
  change: ParticipationChange,
): Promise<ParticipationChangeResult | null> {
  const seen = await tx.attendanceEvent.findUnique({
    where: { opId: change.opId },
    select: {
      fromState: true,
      toState: true,
      method: true,
      actorId: true,
      tripMembership: {
        select: { tripId: true, userId: true },
      },
    },
  });

  if (!seen) {
    return null;
  }

  if (
    seen.tripMembership.tripId !== change.tripId ||
    seen.tripMembership.userId !== change.userId ||
    seen.fromState !== change.from ||
    seen.toState !== change.to ||
    seen.method !== change.method ||
    seen.actorId !== change.actorId
  ) {
    throw new HttpError(
      'CONFLICT',
      'This operation ID belongs to a different participation change.',
      { reason: RegistrationErrorReason.PARTICIPATION_NOT_ALLOWED },
    );
  }

  return current(tx, change.tripId, change.userId, true, true);
}

async function current(
  tx: Prisma.TransactionClient,
  tripId: string,
  userId: string,
  applied: boolean,
  replayed: boolean,
): Promise<ParticipationChangeResult> {
  const row = await tx.tripMembership.findUnique({
    where: { tripId_userId: { tripId, userId } },
    select: { id: true, participation: true, version: true },
  });
  return {
    applied,
    replayed,
    membershipId: row?.id ?? null,
    participation: row?.participation ?? 'NOT_REGISTERED',
    version: row?.version ?? 0,
  };
}

export async function applyParticipationChange(
  tx: Prisma.TransactionClient,
  change: ParticipationChange,
  pending: ParticipationChanged[] = [],
): Promise<ParticipationChangeResult> {
  const replay = await replayIfSeen(tx, change);
  if (replay) {
    return replay;
  }
  if (!canChangeParticipation(change.from, change.to)) {
    throw new HttpError(
      'CONFLICT',
      `Participation cannot move from ${change.from} to ${change.to}.`,
      { reason: RegistrationErrorReason.PARTICIPATION_NOT_ALLOWED },
    );
  }

  const fields: MembershipFields = { ...change.set };

  if (
    change.lateMinutes !== undefined &&
    fields.lateMinutes !== undefined &&
    change.lateMinutes !== fields.lateMinutes
  ) {
    throw new HttpError(
      'VALIDATION_FAILED',
      'Late minutes differ between the event and membership.',
    );
  }

  const lateMinutes = change.lateMinutes ?? fields.lateMinutes ?? null;

  if (change.lateMinutes !== undefined || fields.lateMinutes !== undefined) {
    fields.lateMinutes = lateMinutes;
  }

  if (change.to === 'CHECKED_IN') {
    if (change.method === 'SYSTEM') {
      throw new HttpError(
        'VALIDATION_FAILED',
        'Check-in needs a member, officer, or geofence method.',
      );
    }

    if (fields.checkInMethod != null && fields.checkInMethod !== change.method) {
      throw new HttpError('VALIDATION_FAILED', 'Check-in methods do not match.');
    }

    fields.checkInMethod = change.method;
    fields.checkedInAt ??= new Date();

    if (change.method === 'OFFICER') {
      if (!change.actorId) {
        throw new HttpError('VALIDATION_FAILED', 'Officer check-in requires an officer actor.');
      }

      if (fields.checkedInById != null && fields.checkedInById !== change.actorId) {
        throw new HttpError('VALIDATION_FAILED', 'Check-in officer does not match the actor.');
      }

      fields.checkedInById = change.actorId;
    } else {
      if (fields.checkedInById != null) {
        throw new HttpError('VALIDATION_FAILED', 'Self/geofence check-in cannot name an officer.');
      }

      fields.checkedInById = null;
    }
  }

  const where = { tripId: change.tripId, userId: change.userId };
  const existing = await tx.tripMembership.findUnique({
    where: { tripId_userId: where },
    select: { id: true },
  });
  let membershipId: string;
  let version: number;
  if (!existing) {
    if (change.from !== 'NOT_REGISTERED') {
      return current(tx, change.tripId, change.userId, false, false);
    }
    const created = await tx.tripMembership.create({
      data: { ...where, ...fields, participation: change.to },
      select: { id: true, version: true },
    });
    membershipId = created.id;
    version = created.version;
  } else {
    const moved = await tx.tripMembership.updateMany({
      where: { id: existing.id, participation: change.from },
      data: { ...fields, participation: change.to, version: { increment: 1 } },
    });
    if (moved.count === 0) {
      const replayAfterRace = await replayIfSeen(tx, change);

      if (replayAfterRace) {
        return replayAfterRace;
      }

      return current(tx, change.tripId, change.userId, false, false);
    }
    const row = await tx.tripMembership.findUniqueOrThrow({
      where: { id: existing.id },
      select: { version: true },
    });
    membershipId = existing.id;
    version = row.version;
  }

  await tx.attendanceEvent.create({
    data: {
      tripMembershipId: membershipId,
      fromState: change.from,
      toState: change.to,
      method: change.method,
      actorId: change.actorId,
      reason: change.reason ?? null,
      lateMinutes,
      opId: change.opId,
    },
  });
  pending.push({
    tripId: change.tripId,
    userId: change.userId,
    fromState: change.from,
    toState: change.to,
    method: change.method,
    version,
  });
  return {
    applied: true,
    replayed: false,
    membershipId,
    participation: change.to,
    version,
  };
}

export async function participationTransaction<T>(
  work: (tx: Prisma.TransactionClient, apply: ApplyParticipationChange) => Promise<T>,
): Promise<T> {
  const pending: ParticipationChanged[] = [];
  const result = await prisma.$transaction(
    (tx) => work(tx, (change) => applyParticipationChange(tx, change, pending)),
    // Registrations for a popular trip queue on the trip's row lock; give them time to wait.
    { maxWait: TRANSACTION_WAIT_MS, timeout: TRANSACTION_WAIT_MS },
  );
  for (const event of pending) {
    domainEvents.emit('ParticipationChanged', event);
  }
  return result;
}
