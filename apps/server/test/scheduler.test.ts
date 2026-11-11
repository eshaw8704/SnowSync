import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { runSchedulerTick, SCHEDULER_LOCK_KEY } from '../src/modules/trips/scheduler';
import { transition } from '../src/modules/trips/tripTransitionService';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { createTrip } from './helpers/trips';

const DAY = 24 * 60 * 60 * 1000;

describe('Scheduler', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('opens registration on time, as SCHEDULER, with a deterministic opId', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id });
    const opensAt = trip.registrationOpensAt;

    await expect(runSchedulerTick(new Date(opensAt.getTime() - 1000))).resolves.toEqual([]);
    const results = await runSchedulerTick(opensAt);
    expect(results).toEqual([
      {
        tripId: trip.id,
        toState: 'OPEN_FOR_REGISTRATION',
        applied: true,
        currentState: 'OPEN_FOR_REGISTRATION',
        version: 2,
      },
    ]);
    await expect(prisma.tripTransition.findFirstOrThrow()).resolves.toMatchObject({
      actorType: 'SCHEDULER',
      actorId: null,
      opId: `sched:${trip.id}:OPEN_FOR_REGISTRATION`,
    });
  });

  it('does nothing when an officer already moved the trip', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id });
    await transition({
      tripId: trip.id,
      fromState: 'CREATED',
      toState: 'OPEN_FOR_REGISTRATION',
      actorType: 'USER',
      actorId: officer.id,
      opId: randomUUID(),
    });
    await expect(runSchedulerTick(trip.registrationOpensAt)).resolves.toEqual([]);
    await expect(prisma.tripTransition.count()).resolves.toBe(1);
  });

  it('changes nothing on a second run at the same time', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id, state: 'OPEN_FOR_REGISTRATION' });
    await runSchedulerTick(trip.checkInStartsAt);
    await expect(runSchedulerTick(trip.checkInStartsAt)).resolves.toEqual([]);
    await expect(prisma.trip.findUniqueOrThrow({ where: { id: trip.id } })).resolves.toMatchObject({
      state: 'CHECK_IN',
      version: 2,
    });
  });

  it('moves an overdue trip one step per run and never completes it', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({
      createdById: officer.id,
      startsAt: new Date(Date.now() - 2 * DAY),
    });
    const now = new Date();
    for (const expected of ['OPEN_FOR_REGISTRATION', 'CHECK_IN', 'ACTIVE', 'EXIT']) {
      const results = await runSchedulerTick(now);
      expect(results).toMatchObject([{ toState: expected, applied: true }]);
    }
    await expect(runSchedulerTick(now)).resolves.toEqual([]);
    await expect(prisma.trip.findUniqueOrThrow({ where: { id: trip.id } })).resolves.toMatchObject({
      state: 'EXIT',
    });
  });

  it('skips the tick while another server task holds the lock', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id });
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let lockTaken!: () => void;
    const taken = new Promise<void>((resolve) => {
      lockTaken = resolve;
    });
    const other = prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SCHEDULER_LOCK_KEY})`;
      lockTaken();
      await held;
    });
    await taken;
    await expect(runSchedulerTick(trip.registrationOpensAt)).resolves.toBe('skipped');
    release();
    await other;
    await expect(prisma.trip.findUniqueOrThrow({ where: { id: trip.id } })).resolves.toMatchObject({
      state: 'CREATED',
    });
  });
});
