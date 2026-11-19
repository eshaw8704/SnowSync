import type { ApiSuccess, RosterResponse } from '@snowsync/shared';
import { Router } from 'express';
import { parseTripId } from '../../lib/routeParams';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { getRoster } from './rosterQueryService';

//GET /admin/trips/:tripId/roster (SS-80). Guards are listed on each route
export const rosterQueryRouter: Router = Router();

rosterQueryRouter.get(
  '/:tripId/roster',
  requireAuth,
  requirePermission('MANAGE_ROSTER'),
  async (req, res) => {
    const body: ApiSuccess<RosterResponse> = {
      ok: true,
      data: await getRoster(parseTripId(req.params.tripId)),
    };
    res.json(body);
  },
);
