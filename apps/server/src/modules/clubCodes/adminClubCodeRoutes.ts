import { isExecutiveRole, type ApiSuccess, type ClubCodeResponse } from '@snowsync/shared';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/httpError';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { createClubCode } from './clubCodeService';

const createClubCodeRequestSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

/** POST /admin/club-codes: requires an officer role and CREATE_CLUB_CODES. */
export const adminClubCodeRouter: Router = Router();

adminClubCodeRouter.post(
  '/',
  requireAuth,
  requirePermission('CREATE_CLUB_CODES'),
  async (req, res) => {
    const role = req.auth!.role;

    if (role !== 'OFFICER' && !isExecutiveRole(role)) {
      throw new HttpError('FORBIDDEN', "You don't have permission to do this.", {
        reason: 'OFFICER_ONLY',
      });
    }

    const { expiresInDays } = createClubCodeRequestSchema.parse(req.body ?? {});

    const body: ApiSuccess<ClubCodeResponse> = {
      ok: true,
      data: await createClubCode(req.auth!.userId, expiresInDays),
    };

    res.status(201).json(body);
  },
);
