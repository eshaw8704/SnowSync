import {
  DEFAULT_ROLE_PERMISSIONS,
  LOCKED_ROLE_PERMISSIONS,
  PERMISSION_KEYS,
  isConfigurableRole,
  isPermission,
  permissionMap,
  type ConfigurableRole,
  type Permission,
  type PermissionMap,
  type UserRole,
} from '@snowsync/shared';
import { prisma } from '../../db/prisma';

/**
 * The permission map for MEMBER or OFFICER: the shared default, overridden by any rows an
 * executive saved in role_permissions, with locked permissions always forced on.
 */
export async function getRolePermissionMap(role: ConfigurableRole): Promise<PermissionMap> {
  const rows = await prisma.rolePermission.findMany({ where: { role } });
  const map: PermissionMap = { ...DEFAULT_ROLE_PERMISSIONS[role] };
  for (const row of rows) {
    if (isPermission(row.permission)) {
      map[row.permission] = row.granted;
    }
  }
  for (const locked of LOCKED_ROLE_PERMISSIONS[role]) {
    map[locked] = true;
  }
  return map;
}

/** Every permission `role` effectively has. Executives always have all of them. */
export async function getEffectivePermissions(role: UserRole): Promise<Permission[]> {
  const map = isConfigurableRole(role) ? await getRolePermissionMap(role) : permissionMap(true);
  return PERMISSION_KEYS.filter((key) => map[key]);
}

/** True when `role` currently has `permission`. */
export async function roleHasPermission(role: UserRole, permission: Permission): Promise<boolean> {
  return (await getEffectivePermissions(role)).includes(permission);
}
