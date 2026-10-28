import {
  CONFIGURABLE_ROLES,
  LOCKED_ROLE_PERMISSIONS,
  PERMISSION_KEYS,
  type RolePermissionsResponse,
  type UpdateRolePermissionsRequest,
} from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { recordAudit } from '../../lib/auditLog';
import { HttpError } from '../../lib/httpError';
import { getRolePermissionMap } from './permissionService';

/** The current permission maps for MEMBER and OFFICER, plus which ones are locked on. */
export async function getRolePermissions(): Promise<RolePermissionsResponse> {
  const [member, officer] = await Promise.all(
    CONFIGURABLE_ROLES.map((role) => getRolePermissionMap(role)),
  );
  return {
    roles: { MEMBER: member!, OFFICER: officer! },
    locked: {
      MEMBER: [...LOCKED_ROLE_PERMISSIONS.MEMBER],
      OFFICER: [...LOCKED_ROLE_PERMISSIONS.OFFICER],
    },
  };
}

/**
 * Saves a full permission map for MEMBER or OFFICER.
 * Locked permissions cannot be switched off. The change and the reason go to the audit log in the same transaction.
 */
export async function updateRolePermissions(
  actorId: string,
  request: UpdateRolePermissionsRequest,
): Promise<RolePermissionsResponse> {
  const lockedOff = LOCKED_ROLE_PERMISSIONS[request.role].filter(
    (key) => !request.permissions[key],
  );
  if (lockedOff.length > 0) {
    throw new HttpError('VALIDATION_FAILED', 'Some permissions are locked on for safety.', {
      reason: 'PERMISSION_LOCKED',
      permissions: lockedOff,
    });
  }
  const before = await getRolePermissionMap(request.role);
  await prisma.$transaction(async (tx) => {
    for (const permission of PERMISSION_KEYS) {
      await tx.rolePermission.upsert({
        where: { role_permission: { role: request.role, permission } },
        update: { granted: request.permissions[permission], updatedById: actorId },
        create: {
          role: request.role,
          permission,
          granted: request.permissions[permission],
          updatedById: actorId,
        },
      });
    }
    await recordAudit(
      {
        actorId,
        action: 'ROLE_PERMISSIONS_UPDATED',
        targetType: 'ROLE',
        targetId: request.role,
        reason: request.reason,
        before,
        after: request.permissions,
      },
      tx,
    );
  });
  return getRolePermissions();
}
