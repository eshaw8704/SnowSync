import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import {
  issueSession,
  revokeAllForUser,
  verifyAccessToken,
} from '../src/modules/auth/tokenService';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';

describe('token service and session endpoints', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('issues an access token that carries only the user id', async () => {
    const user = await createUser();
    const session = await issueSession(user.id);
    await expect(verifyAccessToken(session.accessToken)).resolves.toEqual({ userId: user.id });
    const payload = JSON.parse(
      Buffer.from(session.accessToken.split('.')[1] ?? '', 'base64url').toString(),
    );
    expect(payload.role).toBeUndefined();
    expect(payload.sub).toBe(user.id);
  });

  it('rejects a tampered access token', async () => {
    const user = await createUser();
    const { accessToken } = await issueSession(user.id);
    await expect(verifyAccessToken(`${accessToken}x`)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('rotates refresh tokens and stores only hashes', async () => {
    const user = await createUser();
    const first = await issueSession(user.id);
    const res = await request(createApp())
      .post('/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).not.toBe(first.refreshToken);
    expect(res.body.data).toEqual({
      accessToken: expect.any(String),
      accessTokenExpiresAt: expect.any(String),
      refreshToken: expect.any(String),
      refreshTokenExpiresAt: expect.any(String),
    });
    const rows = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(2);
    expect(rows.some((row) => row.tokenHash === first.refreshToken)).toBe(false);
  });

  it('revokes the whole family when an old refresh token is reused', async () => {
    const user = await createUser();
    const first = await issueSession(user.id);
    const app = createApp();
    const second = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    const reuse = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('UNAUTHORIZED');
    const afterReuse = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: second.body.data.refreshToken });
    expect(afterReuse.status).toBe(401);
  });

  it('signs out by revoking the token on the server', async () => {
    const user = await createUser();
    const session = await issueSession(user.id);
    const app = createApp();
    const out = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: session.refreshToken });
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ ok: true, data: { signedOut: true } });
    const refresh = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken });
    expect(refresh.status).toBe(401);
  });

  it('refuses expired tokens, unknown tokens and deactivated accounts', async () => {
    const user = await createUser();
    const session = await issueSession(user.id);
    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const app = createApp();
    expect(
      (await request(app).post('/auth/refresh').send({ refreshToken: session.refreshToken }))
        .status,
    ).toBe(401);
    expect((await request(app).post('/auth/refresh').send({ refreshToken: 'nope' })).status).toBe(
      401,
    );

    const other = await createUser({ membershipStatus: 'DEACTIVATED' });
    const otherSession = await issueSession(other.id);
    expect(
      (await request(app).post('/auth/refresh').send({ refreshToken: otherSession.refreshToken }))
        .status,
    ).toBe(401);
  });

  it('can sign a person out everywhere', async () => {
    const user = await createUser();
    await issueSession(user.id);
    await issueSession(user.id);
    await revokeAllForUser(user.id);
    expect(await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } })).toBe(
      0,
    );
  });
});
