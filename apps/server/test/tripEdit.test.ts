import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';
import { validTripRequest } from './helpers/tripRequests';
import { createTrip } from './helpers/trips';

function editBody(version: number, overrides: Record<string, unknown> = {}) {
  const configuration: Partial<ReturnType<typeof validTripRequest>> = validTripRequest();
  delete configuration.rosterUserIds;
  return { ...configuration, version, ...overrides };
}

describe('PATCH /trips/:id', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('saves the full configuration, bumps the version and says whether it was published', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id, state: 'OPEN_FOR_REGISTRATION' });
    const res = await request(createApp())
      .patch(`/trips/${trip.id}`)
      .set('Authorization', await bearerFor(officer.id))
      .send(editBody(1, { name: 'Sugar Bowl powder day', capacity: 30, radiusMeters: 800 }));
    expect(res.status).toBe(200);
    expect(res.body.data.wasPublished).toBe(true);
    expect(res.body.data.trip).toMatchObject({
      name: 'Sugar Bowl powder day',
      capacity: 30,
      version: 2,
      geofence: { radiusMeters: 800 },
    });
    await expect(prisma.auditLog.count({ where: { action: 'TRIP_UPDATED' } })).resolves.toBe(1);
  });

  it('refuses a stale version without overwriting the other officer', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id });
    const app = createApp();
    const auth = await bearerFor(officer.id);
    await request(app)
      .patch(`/trips/${trip.id}`)
      .set('Authorization', auth)
      .send(editBody(1, { name: 'First save' }));
    const stale = await request(app)
      .patch(`/trips/${trip.id}`)
      .set('Authorization', auth)
      .send(editBody(1, { name: 'Second save' }));
    expect(stale.status).toBe(409);
    expect(stale.body.error.details).toEqual({ reason: 'STALE_VERSION', currentVersion: 2 });
    await expect(prisma.trip.findUniqueOrThrow({ where: { id: trip.id } })).resolves.toMatchObject({
      name: 'First save',
    });
  });

  it('refuses edits once the trip is ACTIVE', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id, state: 'ACTIVE' });
    const res = await request(createApp())
      .patch(`/trips/${trip.id}`)
      .set('Authorization', await bearerFor(officer.id))
      .send(editBody(1));
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ reason: 'TRIP_NOT_EDITABLE' });
  });

  it('is forbidden for members', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({ createdById: officer.id });
    const res = await request(createApp())
      .patch(`/trips/${trip.id}`)
      .set('Authorization', await bearerFor(member.id))
      .send(editBody(1));
    expect(res.status).toBe(403);
  });
});

describe('DELETE /trips/:id', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('deletes a CREATED trip with no registrations and records it', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const trip = await createTrip({ createdById: officer.id });
    const res = await request(createApp())
      .delete(`/trips/${trip.id}`)
      .set('Authorization', await bearerFor(officer.id));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true });
    await expect(prisma.trip.count()).resolves.toBe(0);
    await expect(
      prisma.auditLog.count({ where: { action: 'TRIP_DELETED', targetId: trip.id } }),
    ).resolves.toBe(1);
  });

  it('says "Cancel this trip instead" for published trips and trips with registrations', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const published = await createTrip({ createdById: officer.id, state: 'OPEN_FOR_REGISTRATION' });
    const withRoster = await createTrip({
      createdById: officer.id,
      roster: [{ userId: member.id }],
    });
    const app = createApp();
    const auth = await bearerFor(officer.id);
    for (const trip of [published, withRoster]) {
      const res = await request(app).delete(`/trips/${trip.id}`).set('Authorization', auth);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({
        message: 'Cancel this trip instead',
        details: { reason: 'DELETE_NOT_ALLOWED' },
      });
    }
    await expect(prisma.trip.count()).resolves.toBe(2);
  });
});
