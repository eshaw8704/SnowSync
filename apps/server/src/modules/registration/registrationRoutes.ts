import {
  registerRequestSchema,
  type ApiSuccess,
  type CancelRegistrationResult,
  type MyRegistration,
  type RegisterResult,
} from '@snowsync/shared';
import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../lib/httpError';
import { parseTripId } from '../../lib/routeParams';
import { requireApprovedMember, requireAuth } from '../../middleware/requireAuth';
import { cancelOwnRegistration, loadMyRegistration, registerSelf } from './registrationService';

/**
 * Member registration on /trips/:tripId/registration (SS-28, SS-31). Guards are listed on each
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
    // 201 only when this request registered the member. A retry created nothing and answers 200,
    // including one whose registration was cancelled since (alreadyRegistered is false then).
    const created = !result.alreadyRegistered && result.registration.participation === 'REGISTERED';
    res.status(created ? 201 : 200).json(body);
  },
);

registrationRouter.delete(
  '/:tripId/registration',
  requireAuth,
  requireApprovedMember,
  async (req, res) => {
    const tripId = parseTripId(req.params.tripId);
    const body: ApiSuccess<CancelRegistrationResult> = {
      ok: true,
      data: await cancelOwnRegistration(req.auth!.userId, tripId),
    };
    res.json(body);
  },
);
