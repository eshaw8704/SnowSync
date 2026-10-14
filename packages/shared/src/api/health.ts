/** Overall server status reported by `GET /health`. */
export type HealthStatus = 'ok' | 'degraded';

/** Database status reported by `GET /health`. */
export type DatabaseStatus = 'up' | 'down';

/** The `data` field of a `GET /health` response. */
export interface HealthReport {
  status: HealthStatus;
  uptimeSeconds: number;
  database: DatabaseStatus;
}
