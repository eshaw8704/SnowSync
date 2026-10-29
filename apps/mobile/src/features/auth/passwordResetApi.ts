import { apiRequest } from '../../api/apiClient';

/** POST /auth/forgot-password (public). Always succeeds, whether or not the account exists. */
export function requestPasswordReset(email: string): Promise<{ sent: true }> {
  return apiRequest<{ sent: true }>('POST', '/auth/forgot-password', { body: { email } });
}

/** POST /auth/reset-password (public). */
export function resetPassword(token: string, password: string): Promise<{ reset: true }> {
  return apiRequest<{ reset: true }>('POST', '/auth/reset-password', { body: { token, password } });
}
