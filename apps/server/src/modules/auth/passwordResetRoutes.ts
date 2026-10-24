import {
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  type ApiSuccess,
} from '@snowsync/shared';
import { Router } from 'express';
import { requestPasswordReset, resetPassword } from './passwordResetService';

/** POST /auth/forgot-password and POST /auth/reset-password. Both public. */
export const passwordResetRouter: Router = Router();

passwordResetRouter.post('/forgot-password', async (req, res) => {
  const { email } = forgotPasswordRequestSchema.parse(req.body);
  await requestPasswordReset(email);
  const body: ApiSuccess<{ sent: true }> = { ok: true, data: { sent: true } };
  res.status(202).json(body);
});

passwordResetRouter.post('/reset-password', async (req, res) => {
  const { token, password } = resetPasswordRequestSchema.parse(req.body);
  await resetPassword(token, password);
  const body: ApiSuccess<{ reset: true }> = { ok: true, data: { reset: true } };
  res.json(body);
});
