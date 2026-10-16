import type { ApiSuccess, HealthReport } from '@snowsync/shared';
import { Router } from 'express';
import { getHealthReport } from './healthService';

/** GET /health -> 200 when the database is up, 503 when it is down. Public (no auth). */
export const healthRouter: Router = Router();

healthRouter.get('/health', async (_req, res) => {
  const report = await getHealthReport();
  const body: ApiSuccess<HealthReport> = { ok: true, data: report };
  res.status(report.database === 'up' ? 200 : 503).json(body);
});
