import { z } from 'zod';
import { PERMISSION_KEYS, type Permission, type PermissionMap } from '../domain/permission';
import { CONFIGURABLE_ROLES, type ConfigurableRole } from '../domain/userRole';

/** GET /admin/role-permissions (executives only) */
export interface RolePermissionsResponse {
  roles: Record<ConfigurableRole, PermissionMap>;
  locked: Record<ConfigurableRole, Permission[]>;
}

/** PUT /admin/role-permissions (executives only). Every permission must be listed. */
export const updateRolePermissionsRequestSchema = z.object({
  role: z.enum(CONFIGURABLE_ROLES),
  permissions: z.object(
    Object.fromEntries(PERMISSION_KEYS.map((key) => [key, z.boolean()])) as Record<
      Permission,
      z.ZodBoolean
    >,
  ),
  reason: z
    .string()
    .trim()
    .min(3, { message: 'Say why you are changing these permissions.' })
    .max(500, { message: 'Use 500 characters or fewer.' }),
});
export type UpdateRolePermissionsRequest = z.infer<typeof updateRolePermissionsRequestSchema>;
