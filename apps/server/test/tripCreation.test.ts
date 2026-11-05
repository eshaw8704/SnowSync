import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';
import { validTripRequest } from './helpers/tripRequests';

describe('POST /trips', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('saves a CREATED trip with its geofence, REGISTERED roster and an audit entry', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const maya = await createUser({ displayName: 'Maya Lee' });
    const res = await request(createApp())
      .post('/trips')
      .set('Authorization', await bearerFor(officer.id))
      .send(validTripRequest({ rosterUserIds: [maya.id], radiusMeters: 750 }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Sugar Bowl club day',
      state: 'CREATED',
      version: 1,
      resortTimeZone: 'America/Los_Angeles',
      registeredCount: 1,
      geofence: { radiusMeters: 750, label: 'base lodge' },
    });
    const membership = await prisma.tripMembership.findFirstOrThrow({ where: { userId: maya.id } });
    expect(membership).toMatchObject({ participation: 'REGISTERED', registeredById: officer.id });
    await expect(
      prisma.auditLog.count({ where: { action: 'TRIP_CREATED', targetId: res.body.data.id } }),
    ).resolves.toBe(1);
  });

  it('is forbidden for members', async () => {
    const member = await createUser({ role: 'MEMBER' });
    const res = await request(createApp())
      .post('/trips')
      .set('Authorization', await bearerFor(member.id))
      .send(validTripRequest());
    expect(res.status).toBe(403);
    expect(res.body.error.details).toEqual({ permission: 'MANAGE_TRIPS' });
    await expect(prisma.trip.count()).resolves.toBe(0);
  });

  it('refuses a schedule in the wrong order and names the field', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const body = validTripRequest();
    const res = await request(createApp())
      .post('/trips')
      .set('Authorization', await bearerFor(officer.id))
      .send({ ...body, sessionStartsAt: body.checkInStartsAt });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(JSON.stringify(res.body.error.details)).toContain('sessionStartsAt');
    await expect(prisma.trip.count()).resolves.toBe(0);
  });

  it('refuses roster members who are not approved, and saves nothing', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const res = await request(createApp())
      .post('/trips')
      .set('Authorization', await bearerFor(officer.id))
      .send(validTripRequest({ rosterUserIds: [pending.id] }));
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({
      reason: 'ROSTER_MEMBER_NOT_APPROVED',
      userIds: [pending.id],
    });
    await expect(prisma.trip.count()).resolves.toBe(0);
  });
});
