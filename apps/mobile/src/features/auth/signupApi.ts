import type { AuthSession, SignupRequest } from '@snowsync/shared';
import { apiRequest } from '../../api/apiClient';

/** POST /auth/signup (public). */
export function signUp(request: SignupRequest): Promise<AuthSession> {
  return apiRequest<AuthSession>('POST', '/auth/signup', { body: request });
}
