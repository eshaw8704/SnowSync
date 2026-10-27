import { loginRequestSchema, type ApiSuccess, type AuthSession } from '@snowsync/shared';
import { Router } from 'express';
import { logIn } from './loginService';

// Post /auth/login returns new session or error
export const loginRouter: Router = Router();

loginRouter.post('/login', async (req, res) => {
  const session = await logIn(loginRequestSchema.parse(req.body));
  const body: ApiSuccess<AuthSession> = { ok: true, data: session };
  res.json(body);
});
