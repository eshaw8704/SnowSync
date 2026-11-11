import { scheduledTransitionFor, type TransitionResponse } from '@snowsync/shared';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { logger } from '../../lib/logger';
import { transition } from './tripTransitionService';

/** PostgreSQL advisory-lock key: only the server holding it runs a tick. */
export const SCHEDULER_LOCK_KEY = 5_303_001;

/** One transition the Scheduler requested, and what happened. */
export interface SchedulerResult extends TransitionResponse {
  tripId: string;
  toState: string;
}

let timer: NodeJS.Timeout | null = null;

/** Runs one tick at `now`. Returns 'skipped' when another server holds the lock. */
export async function runSchedulerTick(
  now: Date = new Date(),
): Promise<SchedulerResult[] | 'skipped'> {
  return prisma.$transaction(
    async (tx) => {
      // Released automatically when this transaction ends, so a crashed server never holds it.
      const rows = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${SCHEDULER_LOCK_KEY}) AS locked`;
      if (!rows[0]?.locked) {
        return 'skipped' as const;
      }
      const candidates = await tx.trip.findMany({
        where: {
          OR: [
            { state: 'CREATED', registrationOpensAt: { lte: now } },
            { state: 'OPEN_FOR_REGISTRATION', checkInStartsAt: { lte: now } },
            { state: 'CHECK_IN', sessionStartsAt: { lte: now } },
            { state: 'ACTIVE', exitStartsAt: { lte: now } },
          ],
        },
        select: {
          id: true,
          state: true,
          registrationOpensAt: true,
          checkInStartsAt: true,
          sessionStartsAt: true,
          exitStartsAt: true,
        },
        orderBy: { startsAt: 'asc' },
      });
      const results: SchedulerResult[] = [];
      for (const trip of candidates) {
        const due = scheduledTransitionFor(trip, now);
        if (!due) continue;
        const result = await transition({
          tripId: trip.id,
          fromState: due.from,
          toState: due.to,
          actorType: 'SCHEDULER',
          actorId: null,
          opId: `sched:${trip.id}:${due.to}`,
        });
        logger.info(
          { tripId: trip.id, from: due.from, to: due.to, ...result },
          'Scheduler transition',
        );
        results.push({ tripId: trip.id, toState: due.to, ...result });
      }
      return results;
    },
    { timeout: 60_000 },
  );
}

/** Starts ticking every SCHEDULER_INTERVAL_SECONDS. Calling it twice does nothing. */
export function startScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    runSchedulerTick().catch((error: unknown) => {
      logger.error({ err: error }, 'Scheduler tick failed');
    });
  }, env.SCHEDULER_INTERVAL_SECONDS * 1000);
  timer.unref();
  logger.info({ intervalSeconds: env.SCHEDULER_INTERVAL_SECONDS }, 'Trip scheduler started');
}

/** Stops the Scheduler. Safe to call when it never started. */
export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
