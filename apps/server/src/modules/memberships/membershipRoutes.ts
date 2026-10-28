import {
  redeemClubCodeRequestSchema,
  type ApiSuccess,
  type MembershipStatusResponse,
} from '@snowsync/shared';
import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { getMembershipStatus, redeemClubCode } from './membershipService';

/** /membership: for the signed-in person, whatever their membership status. */
export const membershipRouter: Router = Router();

membershipRouter.use(requireAuth);

membershipRouter.get('/status', async (req, res) => {
  const body: ApiSuccess<MembershipStatusResponse> = {
    ok: true,
    data: await getMembershipStatus(req.auth!.userId),
  };
  res.json(body);
});

membershipRouter.post('/code', async (req, res) => {
  const { code } = redeemClubCodeRequestSchema.parse(req.body);
  const body: ApiSuccess<MembershipStatusResponse> = {
    ok: true,
    data: await redeemClubCode(req.auth!.userId, code),
  };
  res.json(body);
});
