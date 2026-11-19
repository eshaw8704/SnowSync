import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';
import { createTrip } from './helpers/trips';

async function getRoster(userId: string, tripId: string) {
  return request(createApp())
    .get(`/admin/trips/${tripId}/roster`)
    .set('Authorization', await bearerFor(userId));
}

describe('GET /admin/trips/:tripId/roster', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('lists members with participation, check-in and payment as separate fields', async () => {
    const officer = await createUser({ role: 'OFFICER', displayName: 'Maya Lee' });
    const riley = await createUser({ displayName: 'Riley Patel' });
    const ava = await createUser({ displayName: 'Ava Chen' });
    const gone = await createUser({ displayName: 'Zed Cancelled' });
    const trip = await createTrip({
      createdById: officer.id,
      state: 'CHECK_IN',
      capacity: 10,
      roster: [
        { userId: riley.id, participation: 'CHECKED_IN' },
        { userId: ava.id },
        { userId: gone.id, participation: 'NOT_REGISTERED' },
      ],
    });
    await prisma.tripMembership.updateMany({
      where: { userId: riley.id },
      data: {
        checkedInAt: new Date('2027-01-18T16:14:00Z'),
        checkInMethod: 'OFFICER',
        checkedInById: officer.id,
        lateMinutes: 4,
      },
    });
    await prisma.charge.createMany({
      data: [
        { userId: riley.id, tripId: trip.id, kind: 'TRIP', amountCents: 4500, status: 'PAID' },
        { userId: ava.id, tripId: trip.id, kind: 'TRIP', amountCents: 4500, status: 'UNPAID' },
      ],
    });

    const res = await getRoster(officer.id, trip.id);
    expect(res.status).toBe(200);
    expect(res.body.data.trip).toMatchObject({ id: trip.id, state: 'CHECK_IN', capacity: 10 });
    expect(res.body.data.entries).toEqual([
      expect.objectContaining({
        displayName: 'Ava Chen',
        participation: 'REGISTERED',
        checkedInAt: null,
        chargeStatus: 'UNPAID',
      }),
      expect.objectContaining({
        displayName: 'Riley Patel',
        participation: 'CHECKED_IN',
        checkedInAt: '2027-01-18T16:14:00.000Z',
        checkInMethod: 'OFFICER',
        checkedInByName: 'Maya Lee',
        lateMinutes: 4,
        chargeStatus: 'PAID',
        chargeAmountCents: 4500,
      }),
    ]);
    expect(res.body.data.summary).toEqual({
      capacity: 10,
      registered: 2,
      checkedIn: 1,
      active: 0,
      notArrived: 1,
      late: 1,
      unpaid: 1,
    });
  });

  it('never returns member locations', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({ createdById: officer.id, roster: [{ userId: member.id }] });
    const res = await getRoster(officer.id, trip.id);
    expect(JSON.stringify(res.body)).not.toMatch(/latitude|longitude/);
  });

  it('is forbidden for members', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({ createdById: officer.id });
    const res = await getRoster(member.id, trip.id);
    expect(res.status).toBe(403);
    expect(res.body.error.details).toEqual({ permission: 'MANAGE_ROSTER' });
  });

  it('answers 404 for a trip that does not exist', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    expect((await getRoster(officer.id, randomUUID())).status).toBe(404);
  });
});
