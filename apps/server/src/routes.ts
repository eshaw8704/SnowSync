import type { Express } from 'express';
import { loginRouter } from './modules/auth/loginRoutes';
import { passwordResetRouter } from './modules/auth/passwordResetRoutes';
import { sessionRouter } from './modules/auth/sessionRoutes';
import { signupRouter } from './modules/auth/signupRoutes';
import { memberSearchRouter } from './modules/admin/memberSearchRoutes';
import { adminClubCodeRouter } from './modules/clubCodes/adminClubCodeRoutes';
import { healthRouter } from './modules/health/healthRoutes';
import { meRouter } from './modules/me/meRoutes';
import { adminMembershipRouter } from './modules/memberships/adminMembershipRoutes';
import { membershipRouter } from './modules/memberships/membershipRoutes';
import { adminRolePermissionRouter } from './modules/permissions/adminRolePermissionRoutes';
import { profileRouter } from './modules/profile/profileRoutes';
import { tripCreationRouter } from './modules/trips/tripCreationRoutes';
import { tripEditRouter } from './modules/trips/tripEditRoutes';
import { tripQueryRouter } from './modules/trips/tripQueryRoutes';
import { tripTransitionRouter } from './modules/trips/tripTransitionRoutes';

/**
 * Mounts every module router. This is the only place routes are registered: Sprint 2 tasks fill
 * in their own router files and never edit this file or app.ts. Sprint 3 added the trip routers.
 */
export function registerRoutes(app: Express): void {
  app.use(healthRouter);

  app.use('/auth', signupRouter);
  app.use('/auth', loginRouter);
  app.use('/auth', sessionRouter);
  app.use('/auth', passwordResetRouter);

  app.use('/me', meRouter);
  app.use('/me', profileRouter);

  app.use('/membership', membershipRouter);

  app.use('/admin/memberships', adminMembershipRouter);
  app.use('/admin/club-codes', adminClubCodeRouter);
  app.use('/admin/role-permissions', adminRolePermissionRouter);

  app.use('/trips', tripQueryRouter);
  app.use('/trips', tripCreationRouter);
  app.use('/trips', tripEditRouter);
  app.use('/trips', tripTransitionRouter);
  app.use('/admin/members', memberSearchRouter);
}
