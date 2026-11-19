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
  const seen = await tx.attendanceEvent.findUnique({ where: { opId: change.opId } });
  if (seen) {
    return current(tx, change.tripId, change.userId, true, true);
  }
  if (!canChangeParticipation(change.from, change.to)) {
    throw new HttpError(
      'CONFLICT',
      `Participation cannot move from ${change.from} to ${change.to}.`,
      { reason: RegistrationErrorReason.PARTICIPATION_NOT_ALLOWED },
    );
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
      data: { ...where, ...change.set, participation: change.to },
      select: { id: true, version: true },
    });
    membershipId = created.id;
    version = created.version;
  } else {
    const moved = await tx.tripMembership.updateMany({
      where: { id: existing.id, participation: change.from },
      data: { ...change.set, participation: change.to, version: { increment: 1 } },
    });
    if (moved.count === 0) {
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
      lateMinutes: change.lateMinutes ?? null,
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
