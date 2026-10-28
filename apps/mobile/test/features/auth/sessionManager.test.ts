import type { MeResponse } from '@snowsync/shared';
import * as SecureStore from 'expo-secure-store';
import { authRequest } from '../../../src/api/authClient';
import { ApiClientError } from '../../../src/api/apiClient';
import {
  refreshSession,
  restoreSession,
  signOut,
  startSessionSync,
} from '../../../src/features/auth/sessionManager';
import { tokenStorage } from '../../../src/features/auth/tokenStorage';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

const me: MeResponse = {
  id: 'u1',
  email: 'jacob@csus.edu',
  displayName: 'Jacob',
  role: 'MEMBER',
  membershipStatus: 'APPROVED',
  onboardingCompleted: true,
  permissions: [],
};

function session(n: number) {
  return {
    accessToken: `access-${n}`,
    accessTokenExpiresAt: '2026-10-20T10:15:00.000Z',
    refreshToken: `refresh-${n}`,
    refreshTokenExpiresAt: '2026-11-19T10:00:00.000Z',
  };
}

function reply(status: number, body: unknown): Response {
  return { status, json: () => Promise.resolve(body) } as unknown as Response;
}

const fetchMock = jest.fn();

beforeEach(() => {
  resetAuthStore();
  (SecureStore as unknown as { __reset: () => void }).__reset();
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

describe('restoreSession', () => {
  it('signs out when nothing is saved', async () => {
    await restoreSession();
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes, loads /me and stays signed in', async () => {
    await tokenStorage.saveRefreshToken('refresh-0');
    fetchMock
      .mockResolvedValueOnce(reply(200, { ok: true, data: session(1) }))
      .mockResolvedValueOnce(reply(200, { ok: true, data: me }));
    await restoreSession();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'signedIn',
      accessToken: 'access-1',
      user: me,
    });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer access-1',
    });
  });

  it('becomes UNVERIFIED with the cached user when the server is unreachable', async () => {
    await tokenStorage.saveRefreshToken('refresh-0');
    await tokenStorage.saveCachedUser(me);
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await restoreSession();
    expect(useAuthStore.getState()).toMatchObject({ status: 'unverified', user: me });
  });

  it('clears the device and signs out when the saved token is refused', async () => {
    await tokenStorage.saveRefreshToken('refresh-0');
    fetchMock.mockResolvedValue(
      reply(401, { ok: false, error: { code: 'UNAUTHORIZED', message: 'x' } }),
    );
    await restoreSession();
    expect(useAuthStore.getState().status).toBe('signedOut');
    await expect(tokenStorage.readRefreshToken()).resolves.toBeNull();
  });
});

describe('authRequest and refreshSession', () => {
  it('refreshes once for several requests that fail together, then retries them', async () => {
    useAuthStore.getState().sessionStarted(session(1));
    let refreshCalls = 0;
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return Promise.resolve(reply(200, { ok: true, data: session(2) }));
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return Promise.resolve(
        auth === 'Bearer access-2'
          ? reply(200, { ok: true, data: 'fresh' })
          : reply(401, { ok: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }),
      );
    });
    const results = await Promise.all([
      authRequest('GET', '/a'),
      authRequest('GET', '/b'),
      authRequest('GET', '/c'),
    ]);
    expect(results).toEqual(['fresh', 'fresh', 'fresh']);
    expect(refreshCalls).toBe(1);
  });

  it('moves to EXPIRED when the refresh is refused', async () => {
    useAuthStore.getState().sessionStarted(session(1));
    fetchMock.mockResolvedValue(
      reply(401, { ok: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }),
    );
    await expect(authRequest('GET', '/me')).rejects.toBeInstanceOf(ApiClientError);
    expect(useAuthStore.getState().status).toBe('expired');
  });

  it('keeps the session when the refresh fails only because of the network', async () => {
    useAuthStore.getState().sessionStarted(session(1));
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(refreshSession()).resolves.toBe(false);
    expect(useAuthStore.getState().status).toBe('signedIn');
  });
});

describe('startSessionSync and signOut', () => {
  it('saves new refresh tokens and loads the user after sign-in', async () => {
    const stop = startSessionSync();
    fetchMock.mockResolvedValue(reply(200, { ok: true, data: me }));
    useAuthStore.getState().sessionStarted(session(3));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(tokenStorage.readRefreshToken()).resolves.toBe('refresh-3');
    expect(useAuthStore.getState().user).toEqual(me);
    stop();
  });

  it('revokes on the server, clears the device and signs out', async () => {
    useAuthStore.getState().sessionStarted(session(4));
    await tokenStorage.saveRefreshToken('refresh-4');
    fetchMock.mockResolvedValue(reply(200, { ok: true, data: { signedOut: true } }));
    await signOut();
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/auth\/logout$/);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      refreshToken: 'refresh-4',
    });
    expect(useAuthStore.getState().status).toBe('signedOut');
    await expect(tokenStorage.readRefreshToken()).resolves.toBeNull();
  });
});
