import { canTransition, type TransitionResponse, type TripState } from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { domainEvents } from '../../lib/domainEvents';
import { HttpError } from '../../lib/httpError';
import { isUniqueViolation } from '../../lib/prismaErrors';

/** One request to move a trip. Officer overrides, the Scheduler and business rules all use this. */
export interface TransitionCommand {
  tripId: string;
  fromState: TripState;
  toState: TripState;
  actorType: 'USER' | 'SCHEDULER' | 'RULE';
  actorId: string | null;
  opId: string;
  reason?: string | null;
}

async function currentResult(tripId: string, applied: boolean): Promise<TransitionResponse> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { state: true, version: true },
  });
  if (!trip) {
    throw new HttpError('NOT_FOUND', "We can't find this trip.");
  }
  return { applied, currentState: trip.state, version: trip.version };
}

/** The only function that changes a trip's state. A repeated opId or a trip that already moved changes nothing. */
export async function transition(command: TransitionCommand): Promise<TransitionResponse> {
  const seen = await prisma.tripTransition.findUnique({ where: { opId: command.opId } });
  if (seen) {
    return currentResult(seen.tripId, true);
  }
  if (!canTransition(command.fromState, command.toState)) {
    throw new HttpError(
      'CONFLICT',
      `A trip cannot move from ${command.fromState} to ${command.toState}.`,
      { reason: 'TRANSITION_NOT_ALLOWED' },
    );
  }

  let result: { applied: boolean; version: number };
  try {
    result = await prisma.$transaction(async (tx) => {
      const moved = await tx.trip.updateMany({
        where: { id: command.tripId, state: command.fromState },
        data: { state: command.toState, version: { increment: 1 } },
      });
      if (moved.count === 0) {
        return { applied: false, version: 0 };
      }
      await tx.tripTransition.create({
        data: {
          tripId: command.tripId,
          fromState: command.fromState,
          toState: command.toState,
          actorType: command.actorType,
          actorId: command.actorId,
          reason: command.reason ?? null,
          opId: command.opId,
        },
      });
      const trip = await tx.trip.findUniqueOrThrow({
        where: { id: command.tripId },
        select: { version: true },
      });
      return { applied: true, version: trip.version };
    });
  } catch (error) {
    // The same opId arrived twice at once; the other request already applied it.
    if (isUniqueViolation(error)) {
      return currentResult(command.tripId, true);
    }
    throw error;
  }

  if (!result.applied) {
    return currentResult(command.tripId, false);
  }
  domainEvents.emit('TripStateChanged', {
    tripId: command.tripId,
    fromState: command.fromState,
    toState: command.toState,
    version: result.version,
    actorType: command.actorType,
  });
  return { applied: true, currentState: command.toState, version: result.version };
}
