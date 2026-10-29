import type { AuthSession, MeResponse } from '@snowsync/shared';
import { ApiClientError, apiRequest } from '../../api/apiClient';
import { authRequest } from '../../api/authClient';
import { useAuthStore } from '../../state/authStore';
import { tokenStorage } from './tokenStorage';

//True when the request never reached the server (no signal, server down, timeout).
function isOffline(error: unknown): boolean {
  return (
    error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')
  );
}

let storageQueue: Promise<unknown> = Promise.resolve();

//Runs secure-storage writes one at a time, in the order they were requested, so a slow token
//save can never finish after a later sign-out has cleared the device.
function queueStorage(task: () => Promise<void>): Promise<void> {
  const next = storageQueue.then(task);
  storageQueue = next.catch(() => undefined);
  return next;
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
  let refreshToken: string | null;
  try {
    refreshToken = await tokenStorage.readRefreshToken();
  } catch {
    // A secure-storage read failure must not leave the app on the restoring screen.
    useAuthStore.getState().signedOut();
    return;
  }
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
      let cachedUser: MeResponse | null = null;
      try {
        cachedUser = await tokenStorage.readCachedUser();
      } catch {
        // No readable cache: show the unverified screen without a cached profile.
      }
      useAuthStore.getState().sessionUnverified(cachedUser);
      return;
    }
    // Even if clearing fails, the person must still land on the sign-in screen.
    await queueStorage(() => tokenStorage.clear()).catch(() => undefined);
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
  await queueStorage(() => tokenStorage.clear()).catch(() => undefined);
  useAuthStore.getState().signedOut();
}

//Keeps secure storage in sync with the store and loads the user after every sign-in. Screens only
//call `useAuthStore.getState().sessionStarted(session)`; this does the rest. Returns an unsubscribe.
export function startSessionSync(): () => void {
  return useAuthStore.subscribe((state, previous) => {
    const token = state.refreshToken;
    if (token && token !== previous.refreshToken) {
      queueStorage(() => tokenStorage.saveRefreshToken(token)).catch(() => {
        // A failed save is retried on the next refresh; the in-memory session still works.
      });
    }
    if (state.status === 'expired' && previous.status !== 'expired') {
      queueStorage(() => tokenStorage.clear()).catch(() => {
        // Nothing more to do: the store already moved to EXPIRED.
      });
    }
    if (state.status === 'signedIn' && !state.user && previous.status !== 'signedIn') {
      loadMe().catch(() => {
        // authRequest already moved the store to EXPIRED if the session was refused.
      });
    }
  });
}
