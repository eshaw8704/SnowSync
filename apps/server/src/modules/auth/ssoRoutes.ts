import { ssoExchangeRequestSchema, type ApiSuccess, type AuthSession } from '@snowsync/shared';
import { Router } from 'express';
import {
  buildAuthorizationUrl,
  completeSsoCallback,
  exchangeSsoCode,
  requireSsoConfig,
} from './ssoService';

/**
 * Sac State SSO on /auth/sso/* (SS-38). The phone opens /start in a browser session; the
 * university redirects to /callback; the app trades the one-time code at /exchange. All three
 * answer 404 while SSO is not configured.
 */
export const ssoRouter: Router = Router();

ssoRouter.get('/sso/start', async (_req, res) => {
  res.redirect(302, await buildAuthorizationUrl());
});

ssoRouter.get('/sso/callback', async (req, res) => {
  res.redirect(302, await completeSsoCallback(req.query));
});

ssoRouter.post('/sso/exchange', async (req, res) => {
  // 404 while SSO is off, even for a malformed body.
  requireSsoConfig();
  const { code } = ssoExchangeRequestSchema.parse(req.body);
  const body: ApiSuccess<AuthSession> = { ok: true, data: await exchangeSsoCode(code) };
  res.json(body);
});
