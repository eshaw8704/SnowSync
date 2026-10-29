import {
  updateRolePermissionsRequestSchema,
  type ApiSuccess,
  type RolePermissionsResponse,
} from '@snowsync/shared';
import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { requireExecutive } from '../../middleware/requirePermission';
import { getRolePermissions, updateRolePermissions } from './rolePermissionService';

/** /admin/role-permissions: executives (Treasurer, Vice President, President) only. */
export const adminRolePermissionRouter: Router = Router();

adminRolePermissionRouter.use(requireAuth, requireExecutive);

adminRolePermissionRouter.get('/', async (_req, res) => {
  const body: ApiSuccess<RolePermissionsResponse> = { ok: true, data: await getRolePermissions() };
  res.json(body);
});

adminRolePermissionRouter.put('/', async (req, res) => {
  const update = updateRolePermissionsRequestSchema.parse(req.body);
  const body: ApiSuccess<RolePermissionsResponse> = {
    ok: true,
    data: await updateRolePermissions(req.auth!.userId, update),
  };
  res.json(body);
});
