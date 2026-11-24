import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';
import { createTrip } from './helpers/trips';

async function registeredMember(capacity = 24) {
  const officer = await createUser({ role: 'OFFICER' });
  const member = await createUser();
  const trip = await createTrip({
    createdById: officer.id,
    state: 'OPEN_FOR_REGISTRATION',
    capacity,
  });
  const registered = await request(createApp())
    .post(`/trips/${trip.id}/registration`)
    .set('Authorization', await bearerFor(member.id))
    .send({ opId: randomUUID() });
  expect(registered.status).toBe(201);
  return { officer, member, trip };
}

async function cancel(userId: string, tripId: string) {
  return request(createApp())
    .delete(`/trips/${tripId}/registration`)
    .set('Authorization', await bearerFor(userId));
}

describe('DELETE /trips/:tripId/registration', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('releases the spot, voids the unpaid charge and records the cancellation', async () => {
    const { member, trip } = await registeredMember();
    const res = await cancel(member.id, trip.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      cancelled: true,
      registration: { participation: 'NOT_REGISTERED', chargeStatus: 'VOID' },
    });
    const membership = await prisma.tripMembership.findFirstOrThrow();
    expect(membership.cancelledAt).not.toBeNull();
    await expect(
      prisma.attendanceEvent.count({ where: { toState: 'NOT_REGISTERED', method: 'SELF' } }),
    ).resolves.toBe(1);
  });

  it('sends a paid charge to refund review and never deletes it', async () => {
    const { member, trip } = await registeredMember();
    await prisma.charge.updateMany({ data: { status: 'PAID' } });
    const res = await cancel(member.id, trip.id);
    expect(res.body.data.registration.chargeStatus).toBe('REFUND_REVIEW');
    expect(await prisma.charge.count()).toBe(1);
  });

  it('frees the spot for someone else and lets the member register again', async () => {
    const { member, trip } = await registeredMember(1);
    expect((await cancel(member.id, trip.id)).body.data.cancelled).toBe(true);
    const other = await createUser();
    const taken = await request(createApp())
      .post(`/trips/${trip.id}/registration`)
      .set('Authorization', await bearerFor(other.id))
      .send({ opId: randomUUID() });
    expect(taken.status).toBe(201);

    expect((await cancel(other.id, trip.id)).body.data.cancelled).toBe(true);
    const back = await request(createApp())
      .post(`/trips/${trip.id}/registration`)
      .set('Authorization', await bearerFor(member.id))
      .send({ opId: randomUUID() });
    expect(back.status).toBe(201);
    expect(back.body.data.registration).toMatchObject({
      participation: 'REGISTERED',
      chargeStatus: 'UNPAID',
    });
  });

  it('is idempotent: cancelling when not registered changes nothing', async () => {
    const { member, trip } = await registeredMember();
    await cancel(member.id, trip.id);
    const again = await cancel(member.id, trip.id);
    expect(again.status).toBe(200);
    expect(again.body.data.cancelled).toBe(false);
    expect(await prisma.attendanceEvent.count({ where: { toState: 'NOT_REGISTERED' } })).toBe(1);
  });

  it('refuses once check-in has started', async () => {
    const { member, trip } = await registeredMember();
    await prisma.trip.update({ where: { id: trip.id }, data: { state: 'CHECK_IN' } });
    const res = await cancel(member.id, trip.id);
    expect(res.status).toBe(409);
    expect(res.body.error.details).toMatchObject({
      reason: 'CANCEL_NOT_ALLOWED',
      tripState: 'CHECK_IN',
    });
    await expect(prisma.tripMembership.findFirstOrThrow()).resolves.toMatchObject({
      participation: 'REGISTERED',
    });
  });

  it('refuses a checked-in member even while the trip is still open', async () => {
    const { member, trip } = await registeredMember();
    await prisma.tripMembership.updateMany({ data: { participation: 'CHECKED_IN' } });
    const res = await cancel(member.id, trip.id);
    expect(res.status).toBe(409);
    expect(res.body.error.details).toMatchObject({
      reason: 'CANCEL_NOT_ALLOWED',
      participation: 'CHECKED_IN',
      tripState: 'OPEN_FOR_REGISTRATION',
    });
    await expect(prisma.charge.findFirstOrThrow()).resolves.toMatchObject({ status: 'UNPAID' });
  });

  it('answers 404 for a trip that does not exist', async () => {
    const member = await createUser();
    expect((await cancel(member.id, randomUUID())).status).toBe(404);
  });
});
