import type { ApiSuccess, MemberSearchResult } from '@snowsync/shared';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { searchApprovedMembers } from './memberSearchService';

/** GET /admin/members/search?q=…: officers with MANAGE_TRIPS, to pick a trip's initial roster. */
export const memberSearchRouter: Router = Router();

const searchQuerySchema = z.object({ q: z.string().max(100).optional() });

memberSearchRouter.get(
  '/search',
  requireAuth,
  requirePermission('MANAGE_TRIPS'),
  async (req, res) => {
    const { q } = searchQuerySchema.parse(req.query);
    const body: ApiSuccess<MemberSearchResult[]> = {
      ok: true,
      data: await searchApprovedMembers(q ?? ''),
    };
    res.json(body);
  },
);
