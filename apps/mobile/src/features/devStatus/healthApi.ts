import type { HealthReport } from '@snowsync/shared';
import { apiRequest } from '../../api/apiClient';

/** Calls GET /health. */
export function fetchHealth(): Promise<HealthReport> {
  return apiRequest<HealthReport>('GET', '/health');
}
