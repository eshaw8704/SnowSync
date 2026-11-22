import {
  rosterAddRequestSchema,
  rosterRemoveRequestSchema,
  type ApiSuccess,
  type RosterEntry,
} from '@snowsync/shared';
import { Router } from 'express';
import { parseTripId, parseUserId } from '../../lib/routeParams';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { addRosterMember, removeRosterMember } from './rosterEditService';

//POST and DELETE /admin/trips/:tripId/roster (SS-80). Guards are listed on each route
export const rosterEditRouter: Router = Router();

rosterEditRouter.post(
  '/:tripId/roster',
  requireAuth,
  requirePermission('MANAGE_ROSTER'),
  async (req, res) => {
    const tripId = parseTripId(req.params.tripId);
    const input = rosterAddRequestSchema.parse(req.body);
    const { entry, added } = await addRosterMember(req.auth!.userId, tripId, input);
    const body: ApiSuccess<RosterEntry> = { ok: true, data: entry };
    res.status(added ? 201 : 200).json(body);
  },
);

rosterEditRouter.delete(
  '/:tripId/roster/:userId',
  requireAuth,
  requirePermission('MANAGE_ROSTER'),
  async (req, res) => {
    const tripId = parseTripId(req.params.tripId);
    const userId = parseUserId(req.params.userId);
    const { reason } = rosterRemoveRequestSchema.parse(req.body);
    const body: ApiSuccess<RosterEntry> = {
      ok: true,
      data: await removeRosterMember(req.auth!.userId, tripId, userId, reason),
    };
    res.json(body);
  },
);
