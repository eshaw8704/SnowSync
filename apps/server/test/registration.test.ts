import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { participationTransaction } from '../src/modules/participation/participationService';
import { addToTrip, lockTrip } from '../src/modules/registration/registrationService';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';
import { createTrip } from './helpers/trips';

const HOUR = 60 * 60 * 1000;

async function openTrip(options: { capacity?: number; costCents?: number } = {}) {
  const officer = await createUser({ role: 'OFFICER' });
  return createTrip({ createdById: officer.id, state: 'OPEN_FOR_REGISTRATION', ...options });
}

async function register(userId: string, tripId: string, opId: string = randomUUID()) {
  return request(createApp())
    .post(`/trips/${tripId}/registration`)
    .set('Authorization', await bearerFor(userId))
    .send({ opId });
}

describe('POST /trips/:tripId/registration', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('registers an approved member with an UNPAID charge and a SELF attendance event', async () => {
    const trip = await openTrip({ costCents: 5000 });
    const member = await createUser();
    const res = await register(member.id, trip.id);

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      alreadyRegistered: false,
      registration: {
        tripId: trip.id,
        participation: 'REGISTERED',
        chargeStatus: 'UNPAID',
        chargeAmountCents: 5000,
        waitlisted: false,
        checkedInAt: null,
        checkInMethod: null,
        checkedInByName: null,
        lateMinutes: null,
      },
    });
    await expect(prisma.attendanceEvent.findFirstOrThrow()).resolves.toMatchObject({
      method: 'SELF',
      actorId: member.id,
      toState: 'REGISTERED',
    });
  });

  it('returns the existing registration when registering twice and creates nothing', async () => {
    const trip = await openTrip();
    const member = await createUser();
    await register(member.id, trip.id);
    const again = await register(member.id, trip.id);

    expect(again.status).toBe(200);
    expect(again.body.data.alreadyRegistered).toBe(true);
    expect(await prisma.tripMembership.count()).toBe(1);
    expect(await prisma.charge.count()).toBe(1);
    expect(await prisma.attendanceEvent.count()).toBe(1);
  });

  it('treats a retry with the same opId as the same registration', async () => {
    const trip = await openTrip();
    const member = await createUser();
    const opId = randomUUID();
    await register(member.id, trip.id, opId);
    const retry = await register(member.id, trip.id, opId);
    expect(retry.status).toBe(200);
    expect(retry.body.data.alreadyRegistered).toBe(true);
    expect(await prisma.attendanceEvent.count()).toBe(1);
  });

  it('rejects an opId that already registered another member or another trip', async () => {
    const trip = await openTrip();
    const otherTrip = await openTrip();
    const member = await createUser();
    const other = await createUser();
    const opId = randomUUID();
    await register(member.id, trip.id, opId);

    for (const [userId, tripId] of [
      [other.id, trip.id],
      [member.id, otherTrip.id],
    ] as const) {
      const res = await register(userId, tripId, opId);
      expect(res.status).toBe(409);
      expect(res.body.error.details.reason).toBe('PARTICIPATION_NOT_ALLOWED');
    }
    expect(await prisma.tripMembership.count()).toBe(1);
    expect(await prisma.charge.count()).toBe(1);
  });

  it('does not charge again when an add is retried with an opId applied before a cancellation', async () => {
    const trip = await openTrip({ costCents: 5000 });
    const member = await createUser();
    const opId = randomUUID();
    await register(member.id, trip.id, opId);
    // The member cancels (SS-163): the spot is released and the charge voided.
    await prisma.tripMembership.updateMany({ data: { participation: 'NOT_REGISTERED' } });
    await prisma.charge.updateMany({ data: { status: 'VOID' } });

    const added = await participationTransaction(async (tx, apply) =>
      addToTrip(tx, apply, await lockTrip(tx, trip.id), {
        userId: member.id,
        method: 'SELF',
        actorId: member.id,
        opId,
      }),
    );

    expect(added).toBe(false);
    expect(await prisma.charge.count({ where: { status: { not: 'VOID' } } })).toBe(0);
    expect(await prisma.attendanceEvent.count()).toBe(1);
  });

  it('never exceeds capacity: 30 members racing for 24 spots get exactly 24', async () => {
    const trip = await openTrip({ capacity: 24 });
    const members = await Promise.all(Array.from({ length: 30 }, () => createUser()));
    const results = await Promise.all(members.map((member) => register(member.id, trip.id)));

    expect(results.filter((res) => res.status === 201)).toHaveLength(24);
    const full = results.filter((res) => res.status === 409);
    expect(full).toHaveLength(6);
    expect(full[0]!.body.error.details.reason).toBe('TRIP_FULL');
    expect(await prisma.tripMembership.count({ where: { participation: 'REGISTERED' } })).toBe(24);
  }, 30_000);

  it('refuses when the trip is full', async () => {
    const trip = await openTrip({ capacity: 1 });
    const first = await createUser();
    const second = await createUser();
    await register(first.id, trip.id);
    const res = await register(second.id, trip.id);
    expect(res.status).toBe(409);
    expect(res.body.error.details).toMatchObject({ reason: 'TRIP_FULL', capacity: 1 });
  });

  it('refuses after the registration deadline and outside OPEN_FOR_REGISTRATION', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const lateTrip = await createTrip({
      createdById: officer.id,
      state: 'OPEN_FOR_REGISTRATION',
      startsAt: new Date(Date.now() + HOUR),
    });
    const draft = await createTrip({ createdById: officer.id, state: 'CREATED' });

    for (const trip of [lateTrip, draft]) {
      const res = await register(member.id, trip.id);
      expect(res.status).toBe(409);
      expect(res.body.error.details.reason).toBe('REGISTRATION_CLOSED');
    }
    expect(await prisma.tripMembership.count()).toBe(0);
  });

  it('is only for approved members', async () => {
    const trip = await openTrip();
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const res = await register(pending.id, trip.id);
    expect(res.status).toBe(403);
  });

  it('answers 404 for a trip that does not exist', async () => {
    const member = await createUser();
    expect((await register(member.id, randomUUID())).status).toBe(404);
    const bad = await request(createApp())
      .post('/trips/not-a-uuid/registration')
      .set('Authorization', await bearerFor(member.id))
      .send({ opId: randomUUID() });
    expect(bad.status).toBe(404);
  });

  it('requires an opId', async () => {
    const trip = await openTrip();
    const member = await createUser();
    const res = await request(createApp())
      .post(`/trips/${trip.id}/registration`)
      .set('Authorization', await bearerFor(member.id))
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /trips/:tripId/registration', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('shows NOT_REGISTERED with no charge before registering', async () => {
    const trip = await openTrip();
    const member = await createUser();
    const res = await request(createApp())
      .get(`/trips/${trip.id}/registration`)
      .set('Authorization', await bearerFor(member.id));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      participation: 'NOT_REGISTERED',
      chargeStatus: null,
      waitlisted: false,
    });
  });

  it('answers 404 for a trip that does not exist', async () => {
    const member = await createUser();
    const res = await request(createApp())
      .get(`/trips/${randomUUID()}/registration`)
      .set('Authorization', await bearerFor(member.id));
    expect(res.status).toBe(404);
  });
});
