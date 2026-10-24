import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import {
  consoleEmailSender,
  setEmailSender,
  type EmailMessage,
} from '../src/lib/email/emailSender';
import { verifyPassword } from '../src/lib/passwordHasher';
import { issueSession } from '../src/modules/auth/tokenService';
import { resetDatabase } from './helpers/db';
import { createUser, TEST_PASSWORD } from './helpers/factories';

const sent: EmailMessage[] = [];

/** Pulls the token out of the reset link in the last email. */
function lastToken(): string {
  const match = /token=([^\s]+)/.exec(sent.at(-1)?.text ?? '');
  return decodeURIComponent(match?.[1] ?? '');
}

describe('password reset', () => {
  beforeEach(async () => {
    await resetDatabase();
    sent.length = 0;

    setEmailSender({
      send: (message) => {
        sent.push(message);
        return Promise.resolve();
      },
    });
  });

  afterEach(() => {
    setEmailSender(consoleEmailSender);
  });

  it('answers the same whether or not the account exists', async () => {
    await createUser({ email: 'jacob@csus.edu' });
    const app = createApp();

    const known = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'jacob@csus.edu' });

    const unknown = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'ghost@csus.edu' });

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual(unknown.body);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('jacob@csus.edu');
    expect(sent[0]?.text).toContain('snowsync://reset-password?token=');
  });

  it('resets once, signs out every session and allows the new password', async () => {
    const user = await createUser({ email: 'jacob@csus.edu' });
    const old = await issueSession(user.id);
    const app = createApp();

    await request(app).post('/auth/forgot-password').send({ email: 'jacob@csus.edu' });

    const token = lastToken();

    const reset = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'Brand-New-Pass-2027' });

    expect(reset.status).toBe(200);

    expect(
      (await request(app).post('/auth/refresh').send({ refreshToken: old.refreshToken })).status,
    ).toBe(401);

    const saved = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    await expect(verifyPassword(saved.passwordHash, 'Brand-New-Pass-2027')).resolves.toBe(true);

    await expect(verifyPassword(saved.passwordHash, TEST_PASSWORD)).resolves.toBe(false);

    const again = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'Another-Pass-2027' });

    expect(again.status).toBe(400);
    expect(again.body.error.details).toEqual({
      reason: 'RESET_TOKEN_INVALID',
    });
  });

  it('expires links after 30 minutes and requires 12 characters', async () => {
    await createUser({ email: 'jacob@csus.edu' });
    const app = createApp();

    await request(app).post('/auth/forgot-password').send({ email: 'jacob@csus.edu' });

    const token = lastToken();

    const short = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'short' });

    expect(short.body.error.code).toBe('VALIDATION_FAILED');

    await prisma.passwordResetToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const expired = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'Long-Enough-2027' });

    expect(expired.body.error.details).toEqual({
      reason: 'RESET_TOKEN_INVALID',
    });
  });

  it('a new request invalidates the previous link', async () => {
    await createUser({ email: 'jacob@csus.edu' });
    const app = createApp();

    await request(app).post('/auth/forgot-password').send({ email: 'jacob@csus.edu' });

    const first = lastToken();

    await request(app).post('/auth/forgot-password').send({ email: 'jacob@csus.edu' });

    const res = await request(app).post('/auth/reset-password').send({
      token: first,
      password: 'Long-Enough-2027',
    });

    expect(res.status).toBe(400);
  });

  it('returns the same response when email delivery fails and preserves the previous link', async () => {
    await createUser({ email: 'jacob@csus.edu' });
    const app = createApp();

    // First, create a working password-reset link.
    await request(app).post('/auth/forgot-password').send({ email: 'jacob@csus.edu' });

    const previousToken = lastToken();

    // Simulate an email delivery failure.
    setEmailSender({
      send: () => Promise.reject(new Error('Email delivery unavailable')),
    });

    const failed = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'jacob@csus.edu' });

    const unknown = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'ghost@csus.edu' });

    // Both responses must be identical.
    expect(failed.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(failed.body).toEqual(unknown.body);

    // The earlier link should still work.
    const reset = await request(app).post('/auth/reset-password').send({
      token: previousToken,
      password: 'New-Secure-Password-2027',
    });

    expect(reset.status).toBe(200);
  });
});
