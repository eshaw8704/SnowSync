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

/**
 * The recorded result for `command.opId`, or null when that opId has never been applied. An opId
 * recorded for a different command (trip, transition, actor or reason) is refused, so a reused id
 * can never report success for a change that did not happen or that the audit trail does not show.
 */
async function replayIfSeen(command: TransitionCommand): Promise<TransitionResponse | null> {
  const seen = await prisma.tripTransition.findUnique({
    where: { opId: command.opId },
    select: {
      tripId: true,
      fromState: true,
      toState: true,
      actorType: true,
      actorId: true,
      reason: true,
    },
  });
  if (!seen) {
    return null;
  }
  if (
    seen.tripId !== command.tripId ||
    seen.fromState !== command.fromState ||
    seen.toState !== command.toState ||
    seen.actorType !== command.actorType ||
    seen.actorId !== command.actorId ||
    seen.reason !== (command.reason ?? null)
  ) {
    throw new HttpError('CONFLICT', 'This operation ID belongs to a different trip change.', {
      reason: 'TRANSITION_NOT_ALLOWED',
    });
  }
  return currentResult(command.tripId, true);
}

/** The only function that changes a trip's state. A repeated opId or a trip that already moved changes nothing. */
export async function transition(command: TransitionCommand): Promise<TransitionResponse> {
  const replay = await replayIfSeen(command);
  if (replay) {
    return replay;
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
      const replay = await replayIfSeen(command);
      if (replay) {
        return replay;
      }
    }
    throw error;
  }

  if (!result.applied) {
    // A concurrent retry with this opId may have committed while we waited on the trip row.
    return (await replayIfSeen(command)) ?? currentResult(command.tripId, false);
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
