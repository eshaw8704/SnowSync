import type { ApiSuccess, ClubCodeResponse } from '@snowsync/shared';
import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { createClubCode } from './clubCodeService';

/** POST /admin/club-codes: needs the CREATE_CLUB_CODES permission. */
export const adminClubCodeRouter: Router = Router();

adminClubCodeRouter.post(
  '/',
  requireAuth,
  requirePermission('CREATE_CLUB_CODES'),
  async (req, res) => {
    const body: ApiSuccess<ClubCodeResponse> = {
      ok: true,
      data: await createClubCode(req.auth!.userId),
    };
    res.status(201).json(body);
  },
);
