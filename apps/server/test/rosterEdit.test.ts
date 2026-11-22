import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';
import { createTrip } from './helpers/trips';

async function add(officerId: string, tripId: string, body: Record<string, unknown>) {
  return request(createApp())
    .post(`/admin/trips/${tripId}/roster`)
    .set('Authorization', await bearerFor(officerId))
    .send(body);
}

async function remove(officerId: string, tripId: string, userId: string, reason?: string) {
  return request(createApp())
    .delete(`/admin/trips/${tripId}/roster/${userId}`)
    .set('Authorization', await bearerFor(officerId))
    .send(reason === undefined ? {} : { reason });
}

describe('POST /admin/trips/:tripId/roster', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('adds an approved member as REGISTERED with a charge, an OFFICER event and an audit row', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const pankaj = await createUser({ displayName: 'Pankaj Kaul' });
    const trip = await createTrip({ createdById: officer.id, state: 'OPEN_FOR_REGISTRATION' });
    const res = await add(officer.id, trip.id, { userId: pankaj.id });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      displayName: 'Pankaj Kaul',
      participation: 'REGISTERED',
      chargeStatus: 'UNPAID',
    });
    await expect(prisma.attendanceEvent.findFirstOrThrow()).resolves.toMatchObject({
      method: 'OFFICER',
      actorId: officer.id,
    });
    await expect(
      prisma.auditLog.count({ where: { action: 'ROSTER_MEMBER_ADDED', targetId: trip.id } }),
    ).resolves.toBe(1);
  });

  it('allows a late add after registration closes', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({ createdById: officer.id, state: 'CHECK_IN' });
    expect((await add(officer.id, trip.id, { userId: member.id })).status).toBe(201);
  });

  it('refuses at capacity unless the officer explicitly overrides', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const first = await createUser();
    const second = await createUser();
    const trip = await createTrip({
      createdById: officer.id,
      state: 'OPEN_FOR_REGISTRATION',
      capacity: 1,
      roster: [{ userId: first.id }],
    });
    const refused = await add(officer.id, trip.id, { userId: second.id });
    expect(refused.status).toBe(409);
    expect(refused.body.error.details.reason).toBe('TRIP_FULL');

    const forced = await add(officer.id, trip.id, { userId: second.id, allowOverCapacity: true });
    expect(forced.status).toBe(201);
    expect(await prisma.tripMembership.count({ where: { participation: 'REGISTERED' } })).toBe(2);
  });

  it('refuses members who are not approved', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const trip = await createTrip({ createdById: officer.id });
    const res = await add(officer.id, trip.id, { userId: pending.id });
    expect(res.status).toBe(400);
    expect(res.body.error.details.reason).toBe('MEMBER_NOT_APPROVED');
  });

  it('changes nothing when the member is already on the roster', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({ createdById: officer.id, roster: [{ userId: member.id }] });
    const res = await add(officer.id, trip.id, { userId: member.id });
    expect(res.status).toBe(200);
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it('refuses once the trip has ended', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({ createdById: officer.id, state: 'COMPLETED' });
    const res = await add(officer.id, trip.id, { userId: member.id });
    expect(res.status).toBe(409);
    expect(res.body.error.details.reason).toBe('TRIP_NOT_EDITABLE');
  });

  it('is forbidden for members', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({ createdById: officer.id });
    expect((await add(member.id, trip.id, { userId: member.id })).status).toBe(403);
  });
});

describe('DELETE /admin/trips/:tripId/roster/:userId', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('releases the spot with a reason, keeps the charge and audits the removal', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({ createdById: officer.id, state: 'OPEN_FOR_REGISTRATION' });
    await add(officer.id, trip.id, { userId: member.id });
    await prisma.charge.updateMany({ data: { status: 'PAID' } });

    const res = await remove(officer.id, trip.id, member.id, 'Asked to be removed');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      participation: 'NOT_REGISTERED',
      chargeStatus: 'REFUND_REVIEW',
    });
    expect(await prisma.charge.count()).toBe(1);
    await expect(
      prisma.auditLog.findFirstOrThrow({ where: { action: 'ROSTER_MEMBER_REMOVED' } }),
    ).resolves.toMatchObject({ reason: 'Asked to be removed', targetId: trip.id });
    await expect(
      prisma.attendanceEvent.findFirstOrThrow({ where: { toState: 'NOT_REGISTERED' } }),
    ).resolves.toMatchObject({ method: 'OFFICER', reason: 'Asked to be removed' });
  });

  it('requires a reason', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({ createdById: officer.id, roster: [{ userId: member.id }] });
    expect((await remove(officer.id, trip.id, member.id)).status).toBe(400);
    expect((await remove(officer.id, trip.id, member.id, ' ')).status).toBe(400);
  });

  it('refuses checked in and active members: that is an attendance decision', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const checkedIn = await createUser();
    const active = await createUser();
    const trip = await createTrip({
      createdById: officer.id,
      state: 'ACTIVE',
      roster: [
        { userId: checkedIn.id, participation: 'CHECKED_IN' },
        { userId: active.id, participation: 'ACTIVE' },
      ],
    });
    for (const member of [checkedIn, active]) {
      const res = await remove(officer.id, trip.id, member.id, 'Went home');
      expect(res.status).toBe(409);
      expect(res.body.error.details.reason).toBe('USE_ATTENDANCE_ACTIONS');
    }
    expect(await prisma.attendanceEvent.count()).toBe(0);
  });

  it('answers 404 when the member is not on the roster', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id });
    const res = await remove(officer.id, trip.id, randomUUID(), 'Not here');
    expect(res.status).toBe(404);
    expect(res.body.error.details.reason).toBe('NOT_ON_ROSTER');
  });
});
