import {
  updateTripRequestSchema,
  type ApiSuccess,
  type UpdateTripResponse,
} from '@snowsync/shared';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/httpError';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { deleteTrip, updateTrip } from './tripEditService';

/**
 * PATCH /trips/:id and DELETE /trips/:id: officers with MANAGE_TRIPS. Guards are listed on each
 * route, never with router.use(), because three other routers share the /trips prefix.
 */
export const tripEditRouter: Router = Router();

function tripIdFrom(raw: unknown): string {
  const parsed = z.uuid().safeParse(raw);
  if (!parsed.success) {
    throw new HttpError('NOT_FOUND', "We can't find this trip.");
  }
  return parsed.data;
}

tripEditRouter.patch(
  '/:tripId',
  requireAuth,
  requirePermission('MANAGE_TRIPS'),
  async (req, res) => {
    const input = updateTripRequestSchema.parse(req.body);
    const body: ApiSuccess<UpdateTripResponse> = {
      ok: true,
      data: await updateTrip(req.auth!.userId, tripIdFrom(req.params.tripId), input),
    };
    res.json(body);
  },
);

tripEditRouter.delete(
  '/:tripId',
  requireAuth,
  requirePermission('MANAGE_TRIPS'),
  async (req, res) => {
    await deleteTrip(req.auth!.userId, tripIdFrom(req.params.tripId));
    const body: ApiSuccess<{ deleted: true }> = { ok: true, data: { deleted: true } };
    res.json(body);
  },
);
