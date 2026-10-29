import { DEFAULT_ROLE_PERMISSIONS } from '@snowsync/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';

describe('role permissions API', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('is executive-only: officers and members get Forbidden', async () => {
    const app = createApp();
    for (const role of ['MEMBER', 'OFFICER'] as const) {
      const user = await createUser({ role });
      const res = await request(app)
        .get('/admin/role-permissions')
        .set('Authorization', await bearerFor(user.id));
      expect(res.status).toBe(403);
      expect(res.body.error.details).toEqual({ reason: 'EXECUTIVE_ONLY' });
    }
    for (const role of ['TREASURER', 'VICE_PRESIDENT', 'PRESIDENT'] as const) {
      const user = await createUser({ role });
      const res = await request(app)
        .get('/admin/role-permissions')
        .set('Authorization', await bearerFor(user.id));
      expect(res.status).toBe(200);
    }
  });

  it('returns the defaults and the locked list', async () => {
    const president = await createUser({ role: 'PRESIDENT' });
    const res = await request(createApp())
      .get('/admin/role-permissions')
      .set('Authorization', await bearerFor(president.id));
    expect(res.body.data).toEqual({
      roles: DEFAULT_ROLE_PERMISSIONS,
      locked: { MEMBER: [], OFFICER: ['MONITOR_TRIPS'] },
    });
  });

  it('saves a role, takes effect on the next request and writes an audit entry', async () => {
    const treasurer = await createUser({ role: 'TREASURER' });
    const member = await createUser({ role: 'MEMBER' });
    const app = createApp();
    const permissions = { ...DEFAULT_ROLE_PERMISSIONS.MEMBER, REVIEW_MEMBERSHIPS: true };
    const save = await request(app)
      .put('/admin/role-permissions')
      .set('Authorization', await bearerFor(treasurer.id))
      .send({ role: 'MEMBER', permissions, reason: 'Trip leads help with approvals' });
    expect(save.status).toBe(200);
    expect(save.body.data.roles.MEMBER.REVIEW_MEMBERSHIPS).toBe(true);
    const me = await request(app)
      .get('/me')
      .set('Authorization', await bearerFor(member.id));
    expect(me.body.data.permissions).toEqual(['REVIEW_MEMBERSHIPS']);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'ROLE_PERMISSIONS_UPDATED' },
    });
    expect(audit).toMatchObject({
      actorId: treasurer.id,
      targetType: 'ROLE',
      targetId: 'MEMBER',
      reason: 'Trip leads help with approvals',
    });
  });

  it('refuses to switch off a locked permission and to edit executive roles', async () => {
    const president = await createUser({ role: 'PRESIDENT' });
    const app = createApp();
    const header = await bearerFor(president.id);
    const lockedOff = await request(app)
      .put('/admin/role-permissions')
      .set('Authorization', header)
      .send({
        role: 'OFFICER',
        permissions: { ...DEFAULT_ROLE_PERMISSIONS.OFFICER, MONITOR_TRIPS: false },
        reason: 'Testing',
      });
    expect(lockedOff.status).toBe(400);
    expect(lockedOff.body.error.details).toEqual({
      reason: 'PERMISSION_LOCKED',
      permissions: ['MONITOR_TRIPS'],
    });
    const executive = await request(app)
      .put('/admin/role-permissions')
      .set('Authorization', header)
      .send({
        role: 'TREASURER',
        permissions: DEFAULT_ROLE_PERMISSIONS.OFFICER,
        reason: 'Testing',
      });
    expect(executive.status).toBe(400);
  });
});
