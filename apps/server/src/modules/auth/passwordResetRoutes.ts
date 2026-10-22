import { Router } from 'express';

/**
 * POST /auth/forgot-password and POST /auth/reset-password. Empty until SS-108 (Ahmad) fills it in.
 * Already mounted by src/routes.ts, so that task only replaces this file.
 */
export const passwordResetRouter: Router = Router();
