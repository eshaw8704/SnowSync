import {
  membershipDecisionRequestSchema,
  type ApiSuccess,
  type PendingMembershipItem,
} from '@snowsync/shared';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { decideMembership, listPendingMemberships } from './adminMembershipService';

/** /admin/memberships: needs the REVIEW_MEMBERSHIPS permission. */
export const adminMembershipRouter: Router = Router();

adminMembershipRouter.use(requireAuth, requirePermission('REVIEW_MEMBERSHIPS'));

adminMembershipRouter.get('/', async (_req, res) => {
  const body: ApiSuccess<PendingMembershipItem[]> = {
    ok: true,
    data: await listPendingMemberships(),
  };
  res.json(body);
});

adminMembershipRouter.post('/:userId/decision', async (req, res) => {
  const decision = membershipDecisionRequestSchema.parse(req.body);
  const userId = z.uuid().parse(req.params.userId);
  await decideMembership(req.auth!.userId, userId, decision);
  const body: ApiSuccess<{ decided: true }> = { ok: true, data: { decided: true } };
  res.json(body);
});
