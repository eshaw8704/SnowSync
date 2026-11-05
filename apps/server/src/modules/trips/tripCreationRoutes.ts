import { createTripRequestSchema, type ApiSuccess, type TripDetail } from '@snowsync/shared';
import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { createTrip } from './tripCreationService';

/**
 * POST /trips: officers with MANAGE_TRIPS only. Guards are listed on the route, never with
 * router.use(), because three other routers share the /trips prefix.
 */
export const tripCreationRouter: Router = Router();

tripCreationRouter.post('/', requireAuth, requirePermission('MANAGE_TRIPS'), async (req, res) => {
  const trip = await createTrip(req.auth!.userId, createTripRequestSchema.parse(req.body));
  const body: ApiSuccess<TripDetail> = { ok: true, data: trip };
  res.status(201).json(body);
});
