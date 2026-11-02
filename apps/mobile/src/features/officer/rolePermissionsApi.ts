import type { RolePermissionsResponse, UpdateRolePermissionsRequest } from '@snowsync/shared';
import { authRequest } from '../../api/authClient';

/** GET /admin/role-permissions (executives only) */
export const fetchRolePermissions = () =>
  authRequest<RolePermissionsResponse>('GET', '/admin/role-permissions');

/** PUT /admin/role-permissions (executives only) */
export const updateRolePermissions = (request: UpdateRolePermissionsRequest) =>
  authRequest<RolePermissionsResponse>('PUT', '/admin/role-permissions', { body: request });
