import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';
import { createTrip } from './helpers/trips';

//The trip names in a GET /trips response body, in order.
function names(body: unknown): string[] {
  return (body as { data: { name: string }[] }).data.map((trip) => trip.name);
}

describe('GET /trips', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function scenario() {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    await createTrip({ createdById: officer.id, name: 'Draft day', state: 'CREATED' });
    await createTrip({ createdById: officer.id, name: 'Open day', state: 'OPEN_FOR_REGISTRATION' });
    await createTrip({
      createdById: officer.id,
      name: 'My day',
      state: 'CHECK_IN',
      roster: [{ userId: member.id }, { userId: officer.id }],
    });
    await createTrip({
      createdById: officer.id,
      name: 'Last season',
      state: 'COMPLETED',
      startsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      roster: [{ userId: member.id, participation: 'CHECKED_OUT' }],
    });
    return { officer, member };
  }

  it('never shows CREATED trips to members', async () => {
    const { member } = await scenario();
    const app = createApp();
    const auth = await bearerFor(member.id);
    const available = await request(app).get('/trips?scope=available').set('Authorization', auth);
    const mine = await request(app).get('/trips?scope=mine').set('Authorization', auth);
    const past = await request(app).get('/trips?scope=past').set('Authorization', auth);
    expect(names(available.body)).toEqual(['Open day']);
    expect(names(mine.body)).toEqual(['My day']);
    expect(names(past.body)).toEqual(['Last season']);
    expect(mine.body.data[0]).toMatchObject({
      state: 'CHECK_IN',
      myParticipation: 'REGISTERED',
      registeredCount: 2,
    });
    const created = await request(app).get('/trips?scope=created').set('Authorization', auth);
    expect(created.status).toBe(403);
  });

  it('shows officers the Created group', async () => {
    const { officer } = await scenario();
    const res = await request(createApp())
      .get('/trips?scope=created')
      .set('Authorization', await bearerFor(officer.id));
    expect(names(res.body)).toEqual(['Draft day']);
    expect(res.body.data[0].myParticipation).toBe('NOT_REGISTERED');
  });

  it('keeps trips cancelled before publishing out of Past', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const trip = await createTrip({
      createdById: officer.id,
      name: 'Never published',
      state: 'CANCELLED',
    });
    await prisma.tripTransition.create({
      data: {
        tripId: trip.id,
        fromState: 'CREATED',
        toState: 'CANCELLED',
        actorType: 'USER',
        actorId: officer.id,
        opId: 'test-cancel',
      },
    });
    const res = await request(createApp())
      .get('/trips?scope=past')
      .set('Authorization', await bearerFor(member.id));
    expect(names(res.body)).toEqual([]);
  });
});

describe('GET /trips/:id', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns detail with my participation, and 404 for CREATED trips to members', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser();
    const open = await createTrip({
      createdById: officer.id,
      state: 'OPEN_FOR_REGISTRATION',
      roster: [{ userId: member.id }],
    });
    const draft = await createTrip({ createdById: officer.id, state: 'CREATED' });
    const app = createApp();
    const auth = await bearerFor(member.id);

    const detail = await request(app).get(`/trips/${open.id}`).set('Authorization', auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({
      id: open.id,
      myParticipation: 'REGISTERED',
      capacity: 24,
    });

    const hidden = await request(app).get(`/trips/${draft.id}`).set('Authorization', auth);
    expect(hidden.status).toBe(404);
    const officerView = await request(app)
      .get(`/trips/${draft.id}`)
      .set('Authorization', await bearerFor(officer.id));
    expect(officerView.status).toBe(200);
    const malformed = await request(app).get('/trips/not-a-uuid').set('Authorization', auth);
    expect(malformed.status).toBe(404);
  });

  it('is for approved members only', async () => {
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const res = await request(createApp())
      .get('/trips')
      .set('Authorization', await bearerFor(pending.id));
    expect(res.status).toBe(403);
  });
});
