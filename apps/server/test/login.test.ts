import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { TEST_PASSWORD, createUser } from './helpers/factories';

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('signs in with the right password (any email casing)', async () => {
    await createUser({ email: 'jacob@csus.edu' });
    const res = await request(createApp())
      .post('/auth/login')
      .send({ email: 'JACOB@csus.edu', password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
  });

  it('gives the same generic error for a wrong password and an unknown email', async () => {
    await createUser({ email: 'jacob@csus.edu' });
    const app = createApp();
    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: 'jacob@csus.edu', password: 'nope' });
    const unknown = await request(app)
      .post('/auth/login')
      .send({ email: 'ghost@csus.edu', password: 'nope' });
    expect(wrongPassword.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknown.body);
    expect(wrongPassword.body.error.message).toBe('Email or password is incorrect.');
  });

  it('locks email sign-in for 15 minutes after 5 failures, even for the right password', async () => {
    await createUser({ email: 'jacob@csus.edu' });
    const app = createApp();
    for (let i = 0; i < 4; i += 1) {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'jacob@csus.edu', password: 'wrong' });
      expect(res.status).toBe(401);
    }
    const fifth = await request(app)
      .post('/auth/login')
      .send({ email: 'jacob@csus.edu', password: 'wrong' });
    expect(fifth.status).toBe(429);
    expect(fifth.body.error).toMatchObject({
      code: 'RATE_LIMITED',
      details: { reason: 'SIGN_IN_LOCKED' },
    });
    const lockedUntil = new Date(String(fifth.body.error.details.lockedUntil)).getTime();
    expect(lockedUntil - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    const right = await request(app)
      .post('/auth/login')
      .send({ email: 'jacob@csus.edu', password: TEST_PASSWORD });
    expect(right.status).toBe(429);
  });

  it('unlocks after the lock expires and resets the counter on success', async () => {
    const user = await createUser({ email: 'jacob@csus.edu' });
    await prisma.user.update({
      where: { id: user.id },
      data: { signInLockedUntil: new Date(Date.now() - 1000), failedSignInCount: 3 },
    });
    const res = await request(createApp())
      .post('/auth/login')
      .send({ email: 'jacob@csus.edu', password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.failedSignInCount).toBe(0);
    expect(after.signInLockedUntil).toBeNull();
  });

  it('refuses deactivated accounts with the generic error', async () => {
    await createUser({ email: 'gone@csus.edu', membershipStatus: 'DEACTIVATED' });
    const res = await request(createApp())
      .post('/auth/login')
      .send({ email: 'gone@csus.edu', password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });
});
