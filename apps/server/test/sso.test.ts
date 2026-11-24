import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { parseEnv } from '../src/config/env';
import { prisma } from '../src/db/prisma';
import { configureSso, SSO_PROVIDER } from '../src/modules/auth/ssoService';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { FakeIdentityProvider } from './helpers/fakeIdentityProvider';

const CLIENT_ID = 'snowsync-test';
const idp = new FakeIdentityProvider();

/** Runs the whole browser round trip and returns where the callback sent the phone. */
async function signInAtSacState(code = 'good-code'): Promise<URL> {
  const app = createApp();
  const start = await request(app).get('/auth/sso/start');
  expect(start.status).toBe(302);
  const { state } = idp.authorize(start.headers.location as string);
  const callback = await request(app).get('/auth/sso/callback').query({ code, state });
  expect(callback.status).toBe(302);
  return new URL(callback.headers.location as string);
}

describe('Sac State SSO', () => {
  beforeAll(async () => {
    await idp.start(CLIENT_ID);
  });

  afterAll(async () => {
    configureSso(null);
    await idp.stop();
  });

  beforeEach(async () => {
    await resetDatabase();
    idp.claims = { sub: 'sac-123', email: 'riley@csus.edu', name: 'Riley Patel' };
    configureSso({
      issuerUrl: idp.issuer,
      clientId: CLIENT_ID,
      clientSecret: 'secret',
      callbackUrl: 'http://localhost:3000/auth/sso/callback',
      appRedirectUrl: 'snowsync://sso-complete',
    });
  });

  it('sends the browser to Sac State with PKCE, a nonce and an encrypted state', async () => {
    const res = await request(createApp()).get('/auth/sso/start');
    const url = new URL(res.headers.location as string);
    expect(url.origin + url.pathname).toBe(`${idp.issuer}/authorize`);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: 'http://localhost:3000/auth/sso/callback',
      scope: 'openid email profile',
      code_challenge_method: 'S256',
    });
    expect(url.searchParams.get('state')!.split('.')).toHaveLength(5);
  });

  it('creates a PENDING_APPROVAL member on first sign-in and exchanges the code once', async () => {
    const back = await signInAtSacState();
    expect(back.protocol + back.host).toBe('snowsync:sso-complete');
    const code = back.searchParams.get('code')!;

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'riley@csus.edu' } });
    expect(user).toMatchObject({
      displayName: 'Riley Patel',
      role: 'MEMBER',
      membershipStatus: 'PENDING_APPROVAL',
      passwordHash: null,
    });
    await expect(prisma.userIdentity.findFirstOrThrow()).resolves.toMatchObject({
      userId: user.id,
      provider: SSO_PROVIDER,
      subject: 'sac-123',
    });

    const exchange = await request(createApp()).post('/auth/sso/exchange').send({ code });
    expect(exchange.status).toBe(200);
    expect(exchange.body.data.accessToken).toEqual(expect.any(String));
    expect(exchange.body.data.refreshToken).toEqual(expect.any(String));

    const reused = await request(createApp()).post('/auth/sso/exchange').send({ code });
    expect(reused.status).toBe(401);
    expect(reused.body.error.details.reason).toBe('SSO_CODE_INVALID');
  });

  it('links to the existing account with the same verified email', async () => {
    const existing = await createUser({ email: 'riley@csus.edu' });
    await signInAtSacState();
    await expect(prisma.user.count()).resolves.toBe(1);
    await expect(prisma.userIdentity.findFirstOrThrow()).resolves.toMatchObject({
      userId: existing.id,
    });
  });

  it('finds the account by subject even after the email changes', async () => {
    await signInAtSacState();
    idp.claims = { ...idp.claims, email: 'riley.patel@csus.edu' };
    await signInAtSacState();
    await expect(prisma.user.count()).resolves.toBe(1);
  });

  it('refuses an email the provider says is not verified', async () => {
    idp.claims = { sub: 'x', email: 'someone@gmail.com' };
    const back = await signInAtSacState();
    expect(back.searchParams.get('error')).toBe('EMAIL_NOT_VERIFIED');
    await expect(prisma.user.count()).resolves.toBe(0);
  });

  it('refuses deactivated accounts', async () => {
    await createUser({ email: 'riley@csus.edu', membershipStatus: 'DEACTIVATED' });
    const back = await signInAtSacState();
    expect(back.searchParams.get('error')).toBe('ACCOUNT_DEACTIVATED');
  });

  it('returns to the app with CANCELLED when the student backs out at Sac State', async () => {
    const res = await request(createApp())
      .get('/auth/sso/callback')
      .query({ error: 'access_denied', state: 'x' });
    expect(res.headers.location).toBe('snowsync://sso-complete?error=CANCELLED');
  });

  it('returns to the app with FAILED for a bad code or a tampered state', async () => {
    expect((await signInAtSacState('bad-code')).searchParams.get('error')).toBe('FAILED');
    const res = await request(createApp())
      .get('/auth/sso/callback')
      .query({ code: 'good-code', state: 'not-a-real-state' });
    expect(res.headers.location).toBe('snowsync://sso-complete?error=FAILED');
  });

  it('refuses an expired code', async () => {
    const code = (await signInAtSacState()).searchParams.get('code')!;
    await prisma.ssoLoginCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(createApp()).post('/auth/sso/exchange').send({ code });
    expect(res.status).toBe(401);
  });

  it('treats empty SSO variables in .env as not set', () => {
    const parsed = parseEnv({
      NODE_ENV: 'test',
      PORT: '3000',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      JWT_ACCESS_SECRET: 'x'.repeat(32),
      SSO_ISSUER_URL: '',
      SSO_CLIENT_ID: '',
    });
    expect(parsed.SSO_ISSUER_URL).toBeUndefined();
    expect(parsed.SSO_CLIENT_ID).toBeUndefined();
    expect(parsed.SSO_APP_REDIRECT_URL).toBe('snowsync://sso-complete');
  });

  it('answers 404 everywhere while SSO is not configured', async () => {
    configureSso(null);
    const app = createApp();
    expect((await request(app).get('/auth/sso/start')).status).toBe(404);
    expect((await request(app).get('/auth/sso/callback')).status).toBe(404);
    const exchange = await request(app)
      .post('/auth/sso/exchange')
      .send({ code: 'a'.repeat(43) });
    expect(exchange.status).toBe(404);
    expect(exchange.body.error.details.reason).toBe('SSO_DISABLED');
    expect((await request(app).post('/auth/sso/exchange').send({})).status).toBe(404);
  });
});
