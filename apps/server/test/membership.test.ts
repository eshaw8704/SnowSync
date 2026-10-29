import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { hashToken } from '../src/lib/secureTokens';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';

/** Inserts a club code and returns the plain code. */
async function insertCode(createdById: string, code = 'ABCD2345', expiresInMs = 60_000) {
  await prisma.clubCode.create({
    data: { codeHash: hashToken(code), createdById, expiresAt: new Date(Date.now() + expiresInMs) },
  });
  return code;
}

describe('membership status and club codes', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('shows pending status and the rejection reason only when rejected', async () => {
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const app = createApp();
    const res = await request(app)
      .get('/membership/status')
      .set('Authorization', await bearerFor(pending.id));
    expect(res.body.data).toEqual({
      status: 'PENDING_APPROVAL',
      requestedAt: expect.any(String),
      rejectionReason: null,
    });
    await prisma.user.update({
      where: { id: pending.id },
      data: { membershipStatus: 'REJECTED', membershipRejectionReason: 'Not a current student' },
    });
    const rejected = await request(app)
      .get('/membership/status')
      .set('Authorization', await bearerFor(pending.id));
    expect(rejected.body.data.rejectionReason).toBe('Not a current student');
  });

  it('approves immediately with a valid code, without changing the role', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const code = await insertCode(officer.id);
    const res = await request(createApp())
      .post('/membership/code')
      .set('Authorization', await bearerFor(pending.id))
      .send({ code: code.toLowerCase() });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
    const after = await prisma.user.findUniqueOrThrow({ where: { id: pending.id } });
    expect(after.role).toBe('MEMBER');
    expect(
      await prisma.auditLog.count({ where: { action: 'MEMBERSHIP_APPROVED_BY_CLUB_CODE' } }),
    ).toBe(1);
  });

  it('rejects used, expired and unknown codes with distinct reasons', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const first = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const second = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const app = createApp();
    const code = await insertCode(officer.id);
    await request(app)
      .post('/membership/code')
      .set('Authorization', await bearerFor(first.id))
      .send({ code });
    const used = await request(app)
      .post('/membership/code')
      .set('Authorization', await bearerFor(second.id))
      .send({ code });
    expect(used.body.error.details).toEqual({ reason: 'CODE_USED' });

    const expiredCode = await insertCode(officer.id, 'EXPD2345', -1000);
    const expired = await request(app)
      .post('/membership/code')
      .set('Authorization', await bearerFor(second.id))
      .send({ code: expiredCode });
    expect(expired.body.error.details).toEqual({ reason: 'CODE_EXPIRED' });

    const unknown = await request(app)
      .post('/membership/code')
      .set('Authorization', await bearerFor(second.id))
      .send({ code: 'ZZZZ9999' });
    expect(unknown.status).toBe(409);
    expect(unknown.body.error.details).toEqual({ reason: 'CODE_INVALID' });

    const already = await request(app)
      .post('/membership/code')
      .set('Authorization', await bearerFor(first.id))
      .send({ code: 'ZZZZ9999' });
    expect(already.body.error.details).toEqual({ reason: 'ALREADY_APPROVED' });
  });
});
