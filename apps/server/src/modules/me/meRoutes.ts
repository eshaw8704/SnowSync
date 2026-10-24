import type { ApiSuccess, MeResponse } from '@snowsync/shared';
import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { getMe } from './meService';

export const meRouter: Router = Router();

meRouter.get('/', requireAuth, async (req, res) => {
  const body: ApiSuccess<MeResponse> = {
    ok: true,
    data: await getMe(req.auth!.userId),
  };

  res.json(body);
});
