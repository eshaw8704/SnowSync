import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { domainEvents } from '../src/lib/domainEvents';
import { transition } from '../src/modules/trips/tripTransitionService';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';
import { createTrip } from './helpers/trips';

describe('transition()', () => {
  const events = vi.fn();
  let off: () => void;

  beforeEach(async () => {
    await resetDatabase();
    events.mockReset();
    off = domainEvents.on('TripStateChanged', events);
  });

  afterEach(() => {
    off();
  });

  it('applies, records who did it, bumps the version and emits after commit', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id });
    const result = await transition({
      tripId: trip.id,
      fromState: 'CREATED',
      toState: 'OPEN_FOR_REGISTRATION',
      actorType: 'USER',
      actorId: officer.id,
      opId: randomUUID(),
    });
    expect(result).toEqual({ applied: true, currentState: 'OPEN_FOR_REGISTRATION', version: 2 });
    await expect(prisma.tripTransition.findFirstOrThrow()).resolves.toMatchObject({
      tripId: trip.id,
      fromState: 'CREATED',
      toState: 'OPEN_FOR_REGISTRATION',
      actorType: 'USER',
      actorId: officer.id,
    });
    expect(events).toHaveBeenCalledWith({
      tripId: trip.id,
      fromState: 'CREATED',
      toState: 'OPEN_FOR_REGISTRATION',
      version: 2,
      actorType: 'USER',
    });
  });

  it('returns the current state without error when the trip already moved', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id, state: 'OPEN_FOR_REGISTRATION' });
    const result = await transition({
      tripId: trip.id,
      fromState: 'CREATED',
      toState: 'OPEN_FOR_REGISTRATION',
      actorType: 'SCHEDULER',
      actorId: null,
      opId: `sched:${trip.id}:OPEN_FOR_REGISTRATION`,
    });
    expect(result).toEqual({ applied: false, currentState: 'OPEN_FOR_REGISTRATION', version: 1 });
    expect(events).not.toHaveBeenCalled();
  });

  it('changes nothing when the same opId is repeated', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id });
    const command = {
      tripId: trip.id,
      fromState: 'CREATED' as const,
      toState: 'OPEN_FOR_REGISTRATION' as const,
      actorType: 'USER' as const,
      actorId: officer.id,
      opId: randomUUID(),
    };
    await transition(command);
    const again = await transition(command);
    expect(again).toEqual({ applied: true, currentState: 'OPEN_FOR_REGISTRATION', version: 2 });
    await expect(prisma.tripTransition.count()).resolves.toBe(1);
    expect(events).toHaveBeenCalledTimes(1);
  });

  it('refuses transitions the state machine does not allow', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id });
    await expect(
      transition({
        tripId: trip.id,
        fromState: 'CREATED',
        toState: 'ACTIVE',
        actorType: 'USER',
        actorId: officer.id,
        opId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT', details: { reason: 'TRANSITION_NOT_ALLOWED' } });
  });

  it('lets exactly one of two concurrent callers apply the same change', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id, state: 'OPEN_FOR_REGISTRATION' });
    const base = {
      tripId: trip.id,
      fromState: 'OPEN_FOR_REGISTRATION' as const,
      toState: 'CHECK_IN' as const,
    };
    const results = await Promise.all([
      transition({ ...base, actorType: 'USER', actorId: officer.id, opId: randomUUID() }),
      transition({
        ...base,
        actorType: 'SCHEDULER',
        actorId: null,
        opId: `sched:${trip.id}:CHECK_IN`,
      }),
    ]);
    expect(results.filter((r) => r.applied)).toHaveLength(1);
    expect(results.every((r) => r.currentState === 'CHECK_IN')).toBe(true);
    await expect(prisma.tripTransition.count()).resolves.toBe(1);
    await expect(prisma.trip.findUniqueOrThrow({ where: { id: trip.id } })).resolves.toMatchObject({
      state: 'CHECK_IN',
      version: 2,
    });
  });
});

describe('POST /trips/:id/transitions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('lets an officer open registration early', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id });
    const res = await request(createApp())
      .post(`/trips/${trip.id}/transitions`)
      .set('Authorization', await bearerFor(officer.id))
      .send({ fromState: 'CREATED', toState: 'OPEN_FOR_REGISTRATION', opId: randomUUID() });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      applied: true,
      currentState: 'OPEN_FOR_REGISTRATION',
      version: 2,
    });
  });

  it('requires a reason to start the active session before its scheduled time', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id, state: 'CHECK_IN' });
    const app = createApp();
    const auth = await bearerFor(officer.id);
    const body = { fromState: 'CHECK_IN', toState: 'ACTIVE', opId: randomUUID() };
    const missing = await request(app)
      .post(`/trips/${trip.id}/transitions`)
      .set('Authorization', auth)
      .send(body);
    expect(missing.status).toBe(400);
    expect(missing.body.error.details).toEqual({ reason: 'REASON_REQUIRED' });
    const ok = await request(app)
      .post(`/trips/${trip.id}/transitions`)
      .set('Authorization', auth)
      .send({ ...body, reason: 'Everyone is on the lift already' });
    expect(ok.body.data).toMatchObject({ applied: true, currentState: 'ACTIVE' });
    await expect(prisma.tripTransition.findFirstOrThrow()).resolves.toMatchObject({
      reason: 'Everyone is on the lift already',
    });
  });

  it('refuses completing and cancelling here, and members entirely', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({ createdById: officer.id, state: 'EXIT' });
    const app = createApp();
    const complete = await request(app)
      .post(`/trips/${trip.id}/transitions`)
      .set('Authorization', await bearerFor(officer.id))
      .send({ fromState: 'EXIT', toState: 'COMPLETED', opId: randomUUID() });
    expect(complete.status).toBe(400);
    expect(complete.body.error.details).toEqual({ reason: 'TRANSITION_NOT_ALLOWED' });
    const asMember = await request(app)
      .post(`/trips/${trip.id}/transitions`)
      .set('Authorization', await bearerFor(member.id))
      .send({ fromState: 'EXIT', toState: 'COMPLETED', opId: randomUUID() });
    expect(asMember.status).toBe(403);
  });
});
