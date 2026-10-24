import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { errorHandler } from '../src/middleware/errorHandler';
import { requireApprovedMember, requireAuth } from '../src/middleware/requireAuth';
import { requestLogger } from '../src/middleware/requestLogger';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';

describe('requireAuth and GET /me', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns 401 without a valid bearer token', async () => {
    const app = createApp();

    expect((await request(app).get('/me')).status).toBe(401);

    const bad = await request(app).get('/me').set('Authorization', 'Bearer not-a-token');

    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns identity, membership and effective permissions', async () => {
    const user = await createUser({
      email: 'jacob@csus.edu',
      displayName: 'Jacob Stevens',
      role: 'OFFICER',
    });

    const res = await request(createApp())
      .get('/me')
      .set('Authorization', await bearerFor(user.id));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: user.id,
      email: 'jacob@csus.edu',
      displayName: 'Jacob Stevens',
      role: 'OFFICER',
      membershipStatus: 'APPROVED',
      onboardingCompleted: true,
    });
    expect(res.body.data.permissions).toContain('REVIEW_MEMBERSHIPS');
    expect(res.body.data.permissions).not.toContain('REVIEW_REFUNDS');
  });

  it('reads the role from the database, not the token', async () => {
    const user = await createUser({ role: 'MEMBER' });
    const header = await bearerFor(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'PRESIDENT' },
    });

    const res = await request(createApp()).get('/me').set('Authorization', header);

    expect(res.body.data.role).toBe('PRESIDENT');
    expect(res.body.data.permissions).toContain('REVIEW_REFUNDS');
  });

  it('treats a deactivated account as signed out', async () => {
    const user = await createUser({ membershipStatus: 'DEACTIVATED' });

    const res = await request(createApp())
      .get('/me')
      .set('Authorization', await bearerFor(user.id));

    expect(res.status).toBe(401);
  });

  it('lets pending members read /me but blocks them from club routes', async () => {
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const header = await bearerFor(pending.id);

    const me = await request(createApp()).get('/me').set('Authorization', header);

    expect(me.body.data.membershipStatus).toBe('PENDING_APPROVAL');

    const club = express();
    club.use(requestLogger);
    club.get('/club', requireAuth, requireApprovedMember, (_req, res) => {
      res.json({ ok: true, data: 'welcome' });
    });
    club.use(errorHandler);

    const blocked = await request(club).get('/club').set('Authorization', header);

    expect(blocked.status).toBe(403);
    expect(blocked.body.error.details).toEqual({
      reason: 'MEMBERSHIP_NOT_APPROVED',
    });
  });
});
