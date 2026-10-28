import { refreshSession } from '../features/auth/sessionManager';
import { useAuthStore } from '../state/authStore';
import { ApiClientError, apiRequest, type ApiRequestOptions, type HttpMethod } from './apiClient';

/**
 * Like apiRequest, for endpoints that need a signed-in person: adds `Authorization: Bearer …`.
 * If the server answers UNAUTHORIZED, it refreshes the session once (shared by all concurrent
 * requests) and retries the request one time. If the refresh is refused, the app moves to EXPIRED.
 */
export async function authRequest<T>(
  method: HttpMethod,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  try {
    return await sendWithToken<T>(method, path, options);
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.code !== 'UNAUTHORIZED') {
      throw error;
    }
    if (!(await refreshSession())) {
      throw error;
    }
    return sendWithToken<T>(method, path, options);
  }
}

function sendWithToken<T>(
  method: HttpMethod,
  path: string,
  options: ApiRequestOptions,
): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  return apiRequest<T>(method, path, {
    ...options,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
