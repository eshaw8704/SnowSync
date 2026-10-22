import type { MeResponse } from '@snowsync/shared';
import {
  resetAuthStore,
  selectHasPermission,
  selectIsExecutive,
  selectSessionRoute,
  useAuthStore,
} from '../../src/state/authStore';

const session = {
  accessToken: 'access',
  accessTokenExpiresAt: '2026-10-20T10:15:00.000Z',
  refreshToken: 'refresh',
  refreshTokenExpiresAt: '2026-11-19T10:00:00.000Z',
};

function user(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    id: 'u1',
    email: 'jacob@csus.edu',
    displayName: 'Jacob Stevens',
    role: 'MEMBER',
    membershipStatus: 'APPROVED',
    onboardingCompleted: true,
    permissions: [],
    ...overrides,
  };
}

describe('authStore', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('starts restoring and routes to loading', () => {
    expect(useAuthStore.getState().status).toBe('restoring');
    expect(selectSessionRoute(useAuthStore.getState())).toBe('loading');
  });

  it('stores tokens on sign-in and waits for the user before choosing a screen', () => {
    useAuthStore.getState().sessionStarted(session);
    const state = useAuthStore.getState();
    expect(state).toMatchObject({
      status: 'signedIn',
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(selectSessionRoute(state)).toBe('loading');
  });

  it('routes by membership and onboarding', () => {
    const { sessionStarted, userLoaded } = useAuthStore.getState();
    sessionStarted(session);
    userLoaded(user({ membershipStatus: 'PENDING_APPROVAL' }));
    expect(selectSessionRoute(useAuthStore.getState())).toBe('verification');
    userLoaded(user({ onboardingCompleted: false }));
    expect(selectSessionRoute(useAuthStore.getState())).toBe('onboarding');
    userLoaded(user());
    expect(selectSessionRoute(useAuthStore.getState())).toBe('app');
  });

  it('clears tokens when expired, signed out or unverified', () => {
    const { sessionStarted, sessionExpired, signedOut, sessionUnverified } =
      useAuthStore.getState();
    sessionStarted(session);
    sessionExpired();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'expired',
      accessToken: null,
      refreshToken: null,
    });
    expect(selectSessionRoute(useAuthStore.getState())).toBe('auth');
    signedOut();
    expect(selectSessionRoute(useAuthStore.getState())).toBe('auth');
    sessionUnverified(user());
    expect(useAuthStore.getState()).toMatchObject({
      status: 'unverified',
      user: { id: 'u1' },
      accessToken: null,
    });
    expect(selectSessionRoute(useAuthStore.getState())).toBe('unverified');
  });

  it('answers permission and executive questions from the loaded user', () => {
    const { sessionStarted, userLoaded } = useAuthStore.getState();
    sessionStarted(session);
    userLoaded(user({ role: 'OFFICER', permissions: ['REVIEW_MEMBERSHIPS'] }));
    expect(selectHasPermission('REVIEW_MEMBERSHIPS')(useAuthStore.getState())).toBe(true);
    expect(selectHasPermission('MANAGE_TRIPS')(useAuthStore.getState())).toBe(false);
    expect(selectIsExecutive(useAuthStore.getState())).toBe(false);
    userLoaded(user({ role: 'VICE_PRESIDENT' }));
    expect(selectIsExecutive(useAuthStore.getState())).toBe(true);
  });
});
