import {
  officerCheckInRequestSchema,
  type ApiSuccess,
  type OfficerCheckInResult,
} from '@snowsync/shared';
import { Router } from 'express';
import { parseTripId } from '../../lib/routeParams';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { officerCheckIn } from './checkInService';

//POST /admin/trips/:tripId/checkins (SS-33). Guards are listed on each route
export const checkInRouter: Router = Router();

checkInRouter.post(
  '/:tripId/checkins',
  requireAuth,
  requirePermission('MANAGE_ROSTER'),
  async (req, res) => {
    const tripId = parseTripId(req.params.tripId);
    const input = officerCheckInRequestSchema.parse(req.body);
    const result = await officerCheckIn(req.auth!.userId, tripId, input);
    const body: ApiSuccess<OfficerCheckInResult> = { ok: true, data: result };
    res.status(result.alreadyCheckedIn ? 200 : 201).json(body);
  },
);
