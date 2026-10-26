import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';

describe('officer membership review', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('lets only roles with REVIEW_MEMBERSHIPS list requests; members get Forbidden', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const member = await createUser({ role: 'MEMBER' });
    await createUser({ membershipStatus: 'PENDING_APPROVAL', displayName: 'Riley Pending' });
    const app = createApp();
    const ok = await request(app)
      .get('/admin/memberships')
      .set('Authorization', await bearerFor(officer.id));
    expect(ok.status).toBe(200);
    expect(ok.body.data).toEqual([
      expect.objectContaining({ displayName: 'Riley Pending', requestedAt: expect.any(String) }),
    ]);
    const denied = await request(app)
      .get('/admin/memberships')
      .set('Authorization', await bearerFor(member.id));
    expect(denied.status).toBe(403);
    expect(denied.body.error).toMatchObject({
      code: 'FORBIDDEN',
      details: { permission: 'REVIEW_MEMBERSHIPS' },
    });
  });

  it('follows permission changes made by executives', async () => {
    const president = await createUser({ role: 'PRESIDENT' });
    const member = await createUser({ role: 'MEMBER' });
    await prisma.rolePermission.create({
      data: {
        role: 'MEMBER',
        permission: 'REVIEW_MEMBERSHIPS',
        granted: true,
        updatedById: president.id,
      },
    });
    const res = await request(createApp())
      .get('/admin/memberships')
      .set('Authorization', await bearerFor(member.id));
    expect(res.status).toBe(200);
  });

  it('approves without changing the role and records the audit entry', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const res = await request(createApp())
      .post(`/admin/memberships/${pending.id}/decision`)
      .set('Authorization', await bearerFor(officer.id))
      .send({ decision: 'APPROVE' });
    expect(res.status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: pending.id } });
    expect(after.membershipStatus).toBe('APPROVED');
    expect(after.role).toBe('MEMBER');
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { targetId: pending.id } });
    expect(audit).toMatchObject({
      actorId: officer.id,
      action: 'MEMBERSHIP_APPROVED',
      targetType: 'USER',
    });
  });

  it('requires a reason to reject and stores it for the requester', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const app = createApp();
    const header = await bearerFor(officer.id);
    const noReason = await request(app)
      .post(`/admin/memberships/${pending.id}/decision`)
      .set('Authorization', header)
      .send({ decision: 'REJECT' });
    expect(noReason.status).toBe(400);
    const res = await request(app)
      .post(`/admin/memberships/${pending.id}/decision`)
      .set('Authorization', header)
      .send({ decision: 'REJECT', reason: 'Not a current Sac State student' });
    expect(res.status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: pending.id } });
    expect(after).toMatchObject({
      membershipStatus: 'REJECTED',
      membershipRejectionReason: 'Not a current Sac State student',
    });
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { targetId: pending.id } });
    expect(audit.reason).toBe('Not a current Sac State student');
  });

  it('refuses to decide a request twice', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    const pending = await createUser({ membershipStatus: 'PENDING_APPROVAL' });
    const app = createApp();
    const header = await bearerFor(officer.id);
    await request(app)
      .post(`/admin/memberships/${pending.id}/decision`)
      .set('Authorization', header)
      .send({ decision: 'APPROVE' });
    const again = await request(app)
      .post(`/admin/memberships/${pending.id}/decision`)
      .set('Authorization', header)
      .send({ decision: 'APPROVE' });
    expect(again.status).toBe(409);
    expect(again.body.error.details).toEqual({ reason: 'NOT_PENDING' });
  });
});
