import type { AuthSession, SsoErrorReason } from '@snowsync/shared';
import * as WebBrowser from 'expo-web-browser';
import { apiRequest } from '../../api/apiClient';
import { API_BASE_URL } from '../../api/config';

/**
 * Where the server's callback sends the phone back (SSO_APP_REDIRECT_URL on the server). Expo Go
 * does not register the `snowsync` scheme, so SSO only works in a development or store build.
 */
export const SSO_RETURN_URL = 'snowsync://sso-complete';

/** What came back from Sac State: a one-time code, or the reason there is none. */
export type SsoReturn = { code: string } | { error: SsoErrorReason };

/**
 * Reads `snowsync://sso-complete?code=…` or `?error=…`. Anything else counts as FAILED. A trailing
 * `#fragment` (some browsers and IdPs add one, e.g. `#_=_`) is ignored.
 */
export function parseSsoReturn(url: string): SsoReturn {
  const hash = url.indexOf('#');
  const withoutFragment = hash === -1 ? url : url.slice(0, hash);
  const query = withoutFragment.includes('?')
    ? withoutFragment.slice(withoutFragment.indexOf('?') + 1)
    : '';
  const params = new URLSearchParams(query);
  const code = params.get('code');
  if (code) return { code };
  const error = params.get('error');
  return {
    error:
      error === 'CANCELLED' || error === 'EMAIL_NOT_VERIFIED' || error === 'ACCOUNT_DEACTIVATED'
        ? error
        : 'FAILED',
  };
}

/**
 * Opens Sac State's own sign-in page in a secure browser session (SnowSync never sees the
 * university password) and waits until the server sends the phone back. Closing the browser
 * counts as CANCELLED, so does closing an error page (for example the 404 the server answers
 * while its SSO settings are unset): turn the client flag on only once the server is configured.
 */
export async function openSacStateSignIn(): Promise<SsoReturn> {
  const result = await WebBrowser.openAuthSessionAsync(
    `${API_BASE_URL}/auth/sso/start`,
    SSO_RETURN_URL,
  );
  if (result.type !== 'success') {
    return { error: 'CANCELLED' };
  }
  return parseSsoReturn(result.url);
}

/** POST /auth/sso/exchange: trades the one-time code for a session, like email sign-in. */
export function exchangeSsoCode(code: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('POST', '/auth/sso/exchange', { body: { code } });
}

/** What to tell the student when Sac State sign-in didn't finish. */
export const SSO_ERROR_MESSAGES: Record<SsoErrorReason, string> = {
  CANCELLED: 'Sac State sign-in was cancelled. You can try again or sign in with email.',
  FAILED: "Sac State sign-in didn't finish. Try again or sign in with email.",
  EMAIL_NOT_VERIFIED:
    "Sac State didn't confirm your university email, so we couldn't sign you in. Sign in with email instead.",
  ACCOUNT_DEACTIVATED: 'This account is deactivated. Contact a club officer for help.',
};
