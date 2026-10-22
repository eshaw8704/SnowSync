import { PERMISSION_KEYS } from '@snowsync/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import {
  getEffectivePermissions,
  getRolePermissionMap,
  roleHasPermission,
} from '../src/modules/permissions/permissionService';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';

describe('permissionService', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('uses the shared defaults when no executive has changed anything', async () => {
    await expect(getEffectivePermissions('MEMBER')).resolves.toEqual([]);
    const officer = await getEffectivePermissions('OFFICER');
    expect(officer).not.toContain('REVIEW_REFUNDS');
    expect(officer).toHaveLength(PERMISSION_KEYS.length - 1);
  });

  it('gives executives every permission', async () => {
    for (const role of ['TREASURER', 'VICE_PRESIDENT', 'PRESIDENT'] as const) {
      await expect(getEffectivePermissions(role)).resolves.toEqual(PERMISSION_KEYS);
    }
  });

  it('applies saved overrides but never removes a locked permission', async () => {
    const president = await createUser({ role: 'PRESIDENT' });
    await prisma.rolePermission.createMany({
      data: [
        {
          role: 'MEMBER',
          permission: 'REVIEW_MEMBERSHIPS',
          granted: true,
          updatedById: president.id,
        },
        { role: 'OFFICER', permission: 'MONITOR_TRIPS', granted: false, updatedById: president.id },
        { role: 'OFFICER', permission: 'MANAGE_TRIPS', granted: false, updatedById: president.id },
      ],
    });
    await expect(roleHasPermission('MEMBER', 'REVIEW_MEMBERSHIPS')).resolves.toBe(true);
    const officer = await getRolePermissionMap('OFFICER');
    expect(officer.MONITOR_TRIPS).toBe(true);
    expect(officer.MANAGE_TRIPS).toBe(false);
  });
});
