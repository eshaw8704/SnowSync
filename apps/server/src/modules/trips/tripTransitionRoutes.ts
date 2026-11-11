import {
  isOfficerOverride,
  transitionRequestSchema,
  type ApiSuccess,
  type TransitionResponse,
} from '@snowsync/shared';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../lib/httpError';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { transition } from './tripTransitionService';

/** POST /trips/:tripId/transitions: officer overrides. Guards are on the route because other routers share /trips. */
export const tripTransitionRouter: Router = Router();

tripTransitionRouter.post(
  '/:tripId/transitions',
  requireAuth,
  requirePermission('MANAGE_TRIPS'),
  async (req, res) => {
    const tripId = z.uuid().safeParse(req.params.tripId);
    if (!tripId.success) {
      throw new HttpError('NOT_FOUND', "We can't find this trip.");
    }
    const input = transitionRequestSchema.parse(req.body);
    if (!isOfficerOverride(input.fromState, input.toState)) {
      throw new HttpError(
        'VALIDATION_FAILED',
        'Officers can open registration, start check-in, start the active session or end it here. Completing and cancelling have their own actions.',
        { reason: 'TRANSITION_NOT_ALLOWED' },
      );
    }
    if (input.fromState === 'CHECK_IN' && input.toState === 'ACTIVE' && !input.reason) {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId.data },
        select: { sessionStartsAt: true },
      });
      if (trip && trip.sessionStartsAt.getTime() > Date.now()) {
        throw new HttpError(
          'VALIDATION_FAILED',
          'Starting the active session early requires a reason.',
          { reason: 'REASON_REQUIRED' },
        );
      }
    }
    const result = await transition({
      tripId: tripId.data,
      fromState: input.fromState,
      toState: input.toState,
      actorType: 'USER',
      actorId: req.auth!.userId,
      opId: input.opId,
      reason: input.reason ?? null,
    });
    const body: ApiSuccess<TransitionResponse> = { ok: true, data: result };
    res.json(body);
  },
);
