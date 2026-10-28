import type { AuthSession, LoginRequest } from '@snowsync/shared';
import { apiRequest } from '../../api/apiClient';

/** POST /auth/login (public). */
export function logIn(request: LoginRequest): Promise<AuthSession> {
  return apiRequest<AuthSession>('POST', '/auth/login', { body: request });
}
