import type { Express } from 'express';
import { loginRouter } from './modules/auth/loginRoutes';
import { passwordResetRouter } from './modules/auth/passwordResetRoutes';
import { sessionRouter } from './modules/auth/sessionRoutes';
import { signupRouter } from './modules/auth/signupRoutes';
import { ssoRouter } from './modules/auth/ssoRoutes';
import { memberSearchRouter } from './modules/admin/memberSearchRoutes';
import { checkInRouter } from './modules/checkin/checkInRoutes';
import { adminClubCodeRouter } from './modules/clubCodes/adminClubCodeRoutes';
import { healthRouter } from './modules/health/healthRoutes';
import { meRouter } from './modules/me/meRoutes';
import { adminMembershipRouter } from './modules/memberships/adminMembershipRoutes';
import { membershipRouter } from './modules/memberships/membershipRoutes';
import { adminRolePermissionRouter } from './modules/permissions/adminRolePermissionRoutes';
import { profileRouter } from './modules/profile/profileRoutes';
import { registrationRouter } from './modules/registration/registrationRoutes';
import { adminWaitlistRouter, memberWaitlistRouter } from './modules/registration/waitlistRoutes';
import { rosterEditRouter } from './modules/roster/rosterEditRoutes';
import { rosterQueryRouter } from './modules/roster/rosterQueryRoutes';
import { tripCreationRouter } from './modules/trips/tripCreationRoutes';
import { tripEditRouter } from './modules/trips/tripEditRoutes';
import { tripQueryRouter } from './modules/trips/tripQueryRoutes';
import { tripTransitionRouter } from './modules/trips/tripTransitionRoutes';

export function registerRoutes(app: Express): void {
  app.use(healthRouter);

  app.use('/auth', signupRouter);
  app.use('/auth', loginRouter);
  app.use('/auth', sessionRouter);
  app.use('/auth', passwordResetRouter);
  app.use('/auth', ssoRouter);

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
  app.use('/trips', registrationRouter);
  app.use('/trips', memberWaitlistRouter);
  app.use('/admin/members', memberSearchRouter);

  app.use('/admin/trips', rosterQueryRouter);
  app.use('/admin/trips', rosterEditRouter);
  app.use('/admin/trips', checkInRouter);
  app.use('/admin/trips', adminWaitlistRouter);
}
