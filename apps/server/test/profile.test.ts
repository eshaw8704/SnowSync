import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';

describe('profile, emergency contact, preferences and onboarding', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('is for approved members only', async () => {
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const res = await request(createApp())
      .get('/me/profile')
      .set('Authorization', await bearerFor(pending.id));
    expect(res.status).toBe(403);
    expect(res.body.error.details).toEqual({ reason: 'MEMBERSHIP_NOT_APPROVED' });
  });

  it('reads and updates the profile', async () => {
    const user = await createUser({ displayName: 'Jacob' });
    const app = createApp();
    const header = await bearerFor(user.id);
    const put = await request(app)
      .put('/me/profile')
      .set('Authorization', header)
      .send({ displayName: 'Jacob Stevens', preferredActivity: 'SKIING' });
    expect(put.body.data).toEqual({ displayName: 'Jacob Stevens', preferredActivity: 'SKIING' });
    const get = await request(app).get('/me/profile').set('Authorization', header);
    expect(get.body.data.displayName).toBe('Jacob Stevens');
  });

  it('stores the emergency contact separately and returns null until saved', async () => {
    const user = await createUser();
    const app = createApp();
    const header = await bearerFor(user.id);
    expect(
      (await request(app).get('/me/emergency-contact').set('Authorization', header)).body.data,
    ).toBeNull();
    const contact = { name: 'Taylor Stevens', relationship: 'Sibling', phone: '(916) 555-0142' };
    await request(app).put('/me/emergency-contact').set('Authorization', header).send(contact);
    expect(
      (await request(app).get('/me/emergency-contact').set('Authorization', header)).body.data,
    ).toEqual(contact);
    const bad = await request(app)
      .put('/me/emergency-contact')
      .set('Authorization', header)
      .send({ ...contact, phone: 'x' });
    expect(bad.status).toBe(400);

    const tooFewDigits = await request(app)
      .put('/me/emergency-contact')
      .set('Authorization', header)
      .send({ ...contact, phone: '(12) 34-5' });
    expect(tooFewDigits.status).toBe(400);
  });

  it('returns default notification preferences, then saved ones', async () => {
    const user = await createUser();
    const app = createApp();
    const header = await bearerFor(user.id);
    const defaults = await request(app)
      .get('/me/notification-preferences')
      .set('Authorization', header);
    expect(defaults.body.data).toEqual({
      tripReminders: true,
      clubAnnouncements: true,
      fundraisers: false,
    });
    await request(app)
      .put('/me/notification-preferences')
      .set('Authorization', header)
      .send({ tripReminders: true, clubAnnouncements: false, fundraisers: true });
    const saved = await request(app)
      .get('/me/notification-preferences')
      .set('Authorization', header);
    expect(saved.body.data).toEqual({
      tripReminders: true,
      clubAnnouncements: false,
      fundraisers: true,
    });
  });

  it('completes onboarding only with an emergency contact, and only once', async () => {
    const user = await createUser({ onboardingCompleted: false });
    const app = createApp();
    const header = await bearerFor(user.id);
    const early = await request(app).post('/me/onboarding/complete').set('Authorization', header);
    expect(early.status).toBe(400);
    expect(early.body.error.details).toEqual({
      reason: 'ONBOARDING_INCOMPLETE',
      missing: ['emergencyContact'],
    });
    await request(app)
      .put('/me/emergency-contact')
      .set('Authorization', header)
      .send({ name: 'Taylor', relationship: 'Sibling', phone: '9165550142' });
    expect(
      (await request(app).post('/me/onboarding/complete').set('Authorization', header)).status,
    ).toBe(200);
    expect(
      (await request(app).post('/me/onboarding/complete').set('Authorization', header)).status,
    ).toBe(200);
    const me = await request(app).get('/me').set('Authorization', header);
    expect(me.body.data.onboardingCompleted).toBe(true);
  });
});
