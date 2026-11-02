import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';

describe('POST /admin/club-codes', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('creates a readable 8-character code valid for 7 days and stores only its hash', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const res = await request(createApp())
      .post('/admin/club-codes')
      .set('Authorization', await bearerFor(officer.id));
    expect(res.status).toBe(201);
    expect(res.body.data.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    const days = (new Date(String(res.body.data.expiresAt)).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    const row = await prisma.clubCode.findFirstOrThrow();
    expect(row.codeHash).not.toBe(res.body.data.code);
    expect(await prisma.auditLog.count({ where: { action: 'CLUB_CODE_CREATED' } })).toBe(1);
  });

  it('accepts a custom expiration period', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const res = await request(createApp())
      .post('/admin/club-codes')
      .set('Authorization', await bearerFor(officer.id))
      .send({ expiresInDays: 14 });

    expect(res.status).toBe(201);

    const days = (new Date(String(res.body.data.expiresAt)).getTime() - Date.now()) / 86_400_000;

    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThan(14.1);
  });

  it('rejects invalid expiration periods', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const token = await bearerFor(officer.id);

    for (const expiresInDays of [0, -1, 1.5, 366, '14']) {
      const res = await request(createApp())
        .post('/admin/club-codes')
        .set('Authorization', token)
        .send({ expiresInDays });

      expect(res.status).toBe(400);
    }

    expect(await prisma.clubCode.count()).toBe(0);
  });

  it('works end to end with POST /membership/code', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const app = createApp();
    const created = await request(app)
      .post('/admin/club-codes')
      .set('Authorization', await bearerFor(officer.id));
    const redeemed = await request(app)
      .post('/membership/code')
      .set('Authorization', await bearerFor(pending.id))
      .send({ code: created.body.data.code });
    expect(redeemed.body.data.status).toBe('APPROVED');
  });

  it('refuses members even if CREATE_CLUB_CODES is granted', async () => {
    const president = await createUser({ role: 'PRESIDENT' });
    const member = await createUser({ role: 'MEMBER' });

    await prisma.rolePermission.create({
      data: {
        role: 'MEMBER',
        permission: 'CREATE_CLUB_CODES',
        granted: true,
        updatedById: president.id,
      },
    });

    const res = await request(createApp())
      .post('/admin/club-codes')
      .set('Authorization', await bearerFor(member.id));

    expect(res.status).toBe(403);
    expect(await prisma.clubCode.count()).toBe(0);
  });

  it('is refused without CREATE_CLUB_CODES', async () => {
    const member = await createUser({ role: 'MEMBER' });
    const res = await request(createApp())
      .post('/admin/club-codes')
      .set('Authorization', await bearerFor(member.id));
    expect(res.status).toBe(403);
  });
});
