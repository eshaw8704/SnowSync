import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { minutesLate, officerCheckIn } from '../src/modules/checkin/checkInService';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';
import { createTrip } from './helpers/trips';

const MINUTE = 60_000;

async function setup(state: 'CHECK_IN' | 'ACTIVE' | 'OPEN_FOR_REGISTRATION' = 'CHECK_IN') {
  const officer = await createUser({ role: 'OFFICER', displayName: 'Maya Lee' });
  const riley = await createUser({ displayName: 'Riley Patel' });
  const trip = await createTrip({
    createdById: officer.id,
    state,
    startsAt: new Date(Date.now() + 10 * MINUTE),
    roster: [{ userId: riley.id }],
  });
  return { officer, riley, trip };
}

async function checkIn(officerId: string, tripId: string, userId: string, opId = randomUUID()) {
  return request(createApp())
    .post(`/admin/trips/${tripId}/checkins`)
    .set('Authorization', await bearerFor(officerId))
    .send({ userId, reason: 'Confirmed at the bus', opId });
}

describe('minutesLate()', () => {
  const start = new Date('2027-01-18T16:00:00Z');

  it('is null on time or early', () => {
    expect(minutesLate(start, new Date('2027-01-18T15:55:00Z'))).toBeNull();
    expect(minutesLate(start, start)).toBeNull();
  });

  it('counts whole minutes after the session started', () => {
    expect(minutesLate(start, new Date('2027-01-18T17:18:30Z'))).toBe(78);
  });
});

describe('POST /admin/trips/:tripId/checkins', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('checks a registered member in, recording the officer, the time and the reason', async () => {
    const { officer, riley, trip } = await setup();
    const res = await checkIn(officer.id, trip.id, riley.id);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      alreadyCheckedIn: false,
      entry: {
        displayName: 'Riley Patel',
        participation: 'CHECKED_IN',
        checkInMethod: 'OFFICER',
        checkedInByName: 'Maya Lee',
        lateMinutes: null,
      },
    });
    expect(res.body.data.entry.checkedInAt).not.toBeNull();
    await expect(prisma.attendanceEvent.findFirstOrThrow()).resolves.toMatchObject({
      fromState: 'REGISTERED',
      toState: 'CHECKED_IN',
      method: 'OFFICER',
      actorId: officer.id,
      reason: 'Confirmed at the bus',
    });
  });

  it('records lateness as minutes, never as a different state', async () => {
    const { officer, riley, trip } = await setup('ACTIVE');
    const later = new Date(trip.sessionStartsAt.getTime() + 18 * MINUTE);
    const result = await officerCheckIn(
      officer.id,
      trip.id,
      { userId: riley.id, reason: 'Arrived late', opId: randomUUID() },
      later,
    );
    expect(result.entry).toMatchObject({ participation: 'CHECKED_IN', lateMinutes: 18 });
  });

  it('returns the existing record when the member is already checked in', async () => {
    const { officer, riley, trip } = await setup();
    await checkIn(officer.id, trip.id, riley.id);
    const again = await checkIn(officer.id, trip.id, riley.id);
    expect(again.status).toBe(200);
    expect(again.body.data.alreadyCheckedIn).toBe(true);
    expect(await prisma.attendanceEvent.count()).toBe(1);
  });

  it('treats a retry with the same opId as the same check-in', async () => {
    const { officer, riley, trip } = await setup();
    const opId = randomUUID();
    await checkIn(officer.id, trip.id, riley.id, opId);
    const retry = await checkIn(officer.id, trip.id, riley.id, opId);
    expect(retry.status).toBe(200);
    expect(await prisma.attendanceEvent.count()).toBe(1);
  });

  it('refuses before check-in opens', async () => {
    const { officer, riley, trip } = await setup('OPEN_FOR_REGISTRATION');
    const res = await checkIn(officer.id, trip.id, riley.id);
    expect(res.status).toBe(409);
    expect(res.body.error.details).toMatchObject({
      reason: 'CHECK_IN_NOT_OPEN',
      tripState: 'OPEN_FOR_REGISTRATION',
    });
  });

  it('answers 404 for someone not on the roster', async () => {
    const { officer, trip } = await setup();
    const stranger = await createUser();
    const res = await checkIn(officer.id, trip.id, stranger.id);
    expect(res.status).toBe(404);
    expect(res.body.error.details.reason).toBe('NOT_ON_ROSTER');
  });

  it('requires a reason', async () => {
    const { officer, riley, trip } = await setup();
    const res = await request(createApp())
      .post(`/admin/trips/${trip.id}/checkins`)
      .set('Authorization', await bearerFor(officer.id))
      .send({ userId: riley.id, opId: randomUUID() });
    expect(res.status).toBe(400);
  });

  it('is for officers only', async () => {
    const { riley, trip } = await setup();
    expect((await checkIn(riley.id, trip.id, riley.id)).status).toBe(403);
  });
});
