import type { HealthReport } from '@snowsync/shared';
import { pingDatabase } from '../../db/databaseHealth';

/** Builds the health report. Status is "degraded" whenever the database is down. */
export async function getHealthReport(): Promise<HealthReport> {
  const databaseUp = await pingDatabase();
  return {
    status: databaseUp ? 'ok' : 'degraded',
    uptimeSeconds: Math.floor(process.uptime()),
    database: databaseUp ? 'up' : 'down',
  };
}
