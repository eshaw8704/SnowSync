import {
  registerRequestSchema,
  type ApiSuccess,
  type MyRegistration,
  type RegisterResult,
} from '@snowsync/shared';
import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../lib/httpError';
import { parseTripId } from '../../lib/routeParams';
import { requireApprovedMember, requireAuth } from '../../middleware/requireAuth';
import { loadMyRegistration, registerSelf } from './registrationService';

/**
 * Member registration on /trips/:tripId/registration. Guards are listed on each
 * route, never with router.use(), because other routers share the /trips prefix.
 */
export const registrationRouter: Router = Router();

registrationRouter.get(
  '/:tripId/registration',
  requireAuth,
  requireApprovedMember,
  async (req, res) => {
    const tripId = parseTripId(req.params.tripId);
    const exists = await prisma.trip.count({ where: { id: tripId } });
    if (!exists) {
      throw new HttpError('NOT_FOUND', "We can't find this trip.");
    }
    const body: ApiSuccess<MyRegistration> = {
      ok: true,
      data: await loadMyRegistration(prisma, tripId, req.auth!.userId),
    };
    res.json(body);
  },
);

registrationRouter.post(
  '/:tripId/registration',
  requireAuth,
  requireApprovedMember,
  async (req, res) => {
    const tripId = parseTripId(req.params.tripId);
    const { opId } = registerRequestSchema.parse(req.body);
    const result = await registerSelf(req.auth!.userId, tripId, opId);
    const body: ApiSuccess<RegisterResult> = { ok: true, data: result };
    res.status(result.alreadyRegistered ? 200 : 201).json(body);
  },
);
