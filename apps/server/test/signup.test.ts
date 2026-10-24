import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';

const valid = {
  displayName: 'Jacob Stevens',
  email: 'Jacob@csus.edu',
  password: 'Powder-Day-2027',
};

describe('POST /auth/signup', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('creates a pending member, hashes the password and signs them in', async () => {
    const res = await request(createApp()).post('/auth/signup').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'jacob@csus.edu' } });
    expect(user.role).toBe('MEMBER');
    expect(user.membershipStatus).toBe('PENDING_APPROVAL');
    expect(user.passwordHash?.startsWith('$argon2id$')).toBe(true);
    expect(user.passwordHash).not.toContain('Powder');
  });

  it('accepts only Sac State emails and 12+ character passwords', async () => {
    const app = createApp();
    const wrongDomain = await request(app)
      .post('/auth/signup')
      .send({ ...valid, email: 'jacob@gmail.com' });
    expect(wrongDomain.status).toBe(400);
    expect(wrongDomain.body.error.code).toBe('VALIDATION_FAILED');
    expect(wrongDomain.body.error.details.issues[0]).toEqual({
      path: 'email',
      message: 'Use your Sac State email (@csus.edu).',
    });
    const short = await request(app)
      .post('/auth/signup')
      .send({ ...valid, password: 'short' });
    expect(short.body.error.details.issues[0].message).toBe('Use at least 12 characters.');
  });

  it('refuses an existing email and creates nothing', async () => {
    await createUser({ email: 'jacob@csus.edu' });
    const res = await request(createApp()).post('/auth/signup').send(valid);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'CONFLICT', details: { reason: 'EMAIL_TAKEN' } });
    expect(await prisma.user.count()).toBe(1);
  });
});
