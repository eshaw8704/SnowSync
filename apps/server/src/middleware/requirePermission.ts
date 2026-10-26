import { isExecutiveRole, type Permission } from '@snowsync/shared';
import type { RequestHandler } from 'express';
import { HttpError } from '../lib/httpError';
import { roleHasPermission } from '../modules/permissions/permissionService';

function forbidden(details: Record<string, unknown>): HttpError {
  return new HttpError('FORBIDDEN', "You don't have permission to do this.", details);
}

/**
 * Use after requireAuth. Allows the request only if the person is an approved member whose role
 * currently has permission */
export function requirePermission(permission: Permission): RequestHandler {
  return async (req, _res, next) => {
    const auth = req.auth;
    if (
      !auth ||
      auth.membershipStatus !== 'APPROVED' ||
      !(await roleHasPermission(auth.role, permission))
    ) {
      throw forbidden({ permission });
    }
    next();
  };
}

/** Use after requireAuth. Only approved TREASURER, VICE_PRESIDENT or PRESIDENT may continue. */
export const requireExecutive: RequestHandler = (req, _res, next) => {
  const auth = req.auth;
  if (!auth || auth.membershipStatus !== 'APPROVED' || !isExecutiveRole(auth.role)) {
    throw forbidden({ reason: 'EXECUTIVE_ONLY' });
  }
  next();
};
