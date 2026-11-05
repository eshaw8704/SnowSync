import {
  TRIP_LIST_SCOPES,
  type ApiSuccess,
  type TripDetail,
  type TripSummary,
} from '@snowsync/shared';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/httpError';
import { requireApprovedMember, requireAuth } from '../../middleware/requireAuth';
import { getTrip, listTrips } from './tripQueryService';

//GET /trips and GET /trips/:id: approved members. Guards are listed on each route, never with router.use(), because three other routers share the /trips prefix.
export const tripQueryRouter: Router = Router();

const listQuerySchema = z.object({ scope: z.enum(TRIP_LIST_SCOPES).default('available') });

tripQueryRouter.get('/', requireAuth, requireApprovedMember, async (req, res) => {
  const { scope } = listQuerySchema.parse(req.query);
  const body: ApiSuccess<TripSummary[]> = {
    ok: true,
    data: await listTrips(req.auth!.userId, req.auth!.role, scope),
  };
  res.json(body);
});

tripQueryRouter.get('/:tripId', requireAuth, requireApprovedMember, async (req, res) => {
  const tripId = z.uuid().safeParse(req.params.tripId);
  if (!tripId.success) {
    throw new HttpError('NOT_FOUND', "We can't find this trip.");
  }
  const body: ApiSuccess<TripDetail> = {
    ok: true,
    data: await getTrip(req.auth!.userId, req.auth!.role, tripId.data),
  };
  res.json(body);
});
