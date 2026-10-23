import { refreshRequestSchema, type ApiSuccess, type AuthSession } from '@snowsync/shared';
import { Router } from 'express';
import { revokeRefreshToken, rotateRefreshToken } from './tokenService';

/** POST /auth/refresh and POST /auth/logout. Public: the refresh token is the credential. */
export const sessionRouter: Router = Router();

sessionRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = refreshRequestSchema.parse(req.body);
  const session = await rotateRefreshToken(refreshToken);
  const body: ApiSuccess<AuthSession> = { ok: true, data: session };
  res.json(body);
});

sessionRouter.post('/logout', async (req, res) => {
  const { refreshToken } = refreshRequestSchema.parse(req.body);
  await revokeRefreshToken(refreshToken);
  const body: ApiSuccess<{ signedOut: true }> = { ok: true, data: { signedOut: true } };
  res.json(body);
});
