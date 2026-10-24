import { signupRequestSchema, type ApiSuccess, type AuthSession } from '@snowsync/shared';
import { Router } from 'express';
import { signUp } from './signupService';

/** POST /auth/signup: public. Creates a pending account and returns its first session. */
export const signupRouter: Router = Router();

signupRouter.post('/signup', async (req, res) => {
  const session = await signUp(signupRequestSchema.parse(req.body));
  const body: ApiSuccess<AuthSession> = { ok: true, data: session };
  res.status(201).json(body);
});
