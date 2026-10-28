import type { AuthSession, MeResponse } from '@snowsync/shared';
import { ApiClientError, apiRequest } from '../../api/apiClient';
import { authRequest } from '../../api/authClient';
import { useAuthStore } from '../../state/authStore';
import { tokenStorage } from './tokenStorage';

//true when the req never reached the server(no signla, server down, timeout).

function isOffline(error: unknown): boolean {
  return (
    error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')
  );
}

let refreshInFlight: Promise<boolean> | null = null;

//Exchanges the saved refresh token for a new session. Single-flight: if several requests fail
//with 401 at once, they all wait for ONE refresh call. Resolves true on success.
//A refused refresh token moves the app to EXPIRED; a network failure leaves the session as is.
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refreshToken =
      useAuthStore.getState().refreshToken ?? (await tokenStorage.readRefreshToken());
    if (!refreshToken) {
      useAuthStore.getState().sessionExpired();
      return false;
    }
    try {
      const session = await apiRequest<AuthSession>('POST', '/auth/refresh', {
        body: { refreshToken },
      });
      useAuthStore.getState().sessionStarted(session);
      return true;
    } catch (error) {
      if (!isOffline(error)) {
        useAuthStore.getState().sessionExpired();
      }
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

//Loads GET /me into the store (and the encrypted cache used for read-only offline display).
export async function loadMe(): Promise<MeResponse> {
  const user = await authRequest<MeResponse>('GET', '/me');
  useAuthStore.getState().userLoaded(user);
  await tokenStorage.saveCachedUser(user);
  return user;
}

//Runs once at launch: no saved token → signed out; token accepted → signed in and /me loaded;
//server unreachable → UNVERIFIED with the cached user; token refused → signed out.
export async function restoreSession(): Promise<void> {
  const refreshToken = await tokenStorage.readRefreshToken();
  if (!refreshToken) {
    useAuthStore.getState().signedOut();
    return;
  }
  try {
    const session = await apiRequest<AuthSession>('POST', '/auth/refresh', {
      body: { refreshToken },
    });
    useAuthStore.getState().sessionStarted(session);
    await loadMe();
  } catch (error) {
    if (isOffline(error)) {
      useAuthStore.getState().sessionUnverified(await tokenStorage.readCachedUser());
      return;
    }
    await tokenStorage.clear();
    useAuthStore.getState().signedOut();
  }
}

//Signs out: revokes the refresh token on the server (best effort), clears the device, then the store.
export async function signOut(): Promise<void> {
  const refreshToken =
    useAuthStore.getState().refreshToken ?? (await tokenStorage.readRefreshToken());
  if (refreshToken) {
    try {
      await apiRequest('POST', '/auth/logout', { body: { refreshToken } });
    } catch {
      // Offline sign-out still clears this device; the server token expires on its own.
    }
  }
  await tokenStorage.clear();
  useAuthStore.getState().signedOut();
}

//keeps secure storage in sync with the store and loads the user after every sign-in. Screens only
//call `useAuthStore.getState().sessionStarted(session)`; this does the rest. Returns an unsubscribe.
export function startSessionSync(): () => void {
  return useAuthStore.subscribe((state, previous) => {
    if (state.refreshToken && state.refreshToken !== previous.refreshToken) {
      void tokenStorage.saveRefreshToken(state.refreshToken);
    }
    if (state.status === 'expired' && previous.status !== 'expired') {
      void tokenStorage.clear();
    }
    if (state.status === 'signedIn' && !state.user && previous.status !== 'signedIn') {
      loadMe().catch(() => {
        // authRequest already moved the store to EXPIRED if the session was refused.
      });
    }
  });
}
