import {
  isExecutiveRole,
  type AuthSession,
  type MeResponse,
  type Permission,
} from '@snowsync/shared';
import { create } from 'zustand';

/**
 * Where the app is in the session lifecycle:
 * - restoring: reading the saved session at launch, nothing shown yet
 * - signedOut: no session; show sign-in
 * - signedIn: tokens are valid (user may still be loading)
 * - unverified: a session exists but the server could not be reached at launch
 * - expired: the refresh token was refused; the person must sign in again
 */
export type SessionStatus = 'restoring' | 'signedOut' | 'signedIn' | 'unverified' | 'expired';

/** Everything the app knows about who is signed in. Kept in memory only. */
export interface AuthState {
  status: SessionStatus;
  /** The latest GET /me response (or the cached copy while unverified). */
  user: MeResponse | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  /** Held in memory so the session manager can persist it to secure storage. */
  refreshToken: string | null;
}

/** Typed actions. The store never performs network or storage I/O itself. */
export interface AuthActions {
  /** After signup, login or a successful refresh: store the new tokens and mark signed in. */
  sessionStarted: (session: AuthSession) => void;
  /** After GET /me. */
  userLoaded: (user: MeResponse) => void;
  /** Launch could not reach the server; keep the cached user for read-only display. */
  sessionUnverified: (cachedUser: MeResponse | null) => void;
  /** The server refused the refresh token. */
  sessionExpired: () => void;
  /** No session at all (first launch, or after sign-out). */
  signedOut: () => void;
}

/** The state a fresh app launch starts in. */
export const initialAuthState: AuthState = {
  status: 'restoring',
  user: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshToken: null,
};

const clearedSession = {
  user: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshToken: null,
} as const;

/** The one auth store. Components read it with `useAuthStore(selector)`. */
export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  ...initialAuthState,
  sessionStarted: (session) =>
    set({
      status: 'signedIn',
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      refreshToken: session.refreshToken,
    }),
  userLoaded: (user) => set({ user }),
  sessionUnverified: (cachedUser) =>
    set({ ...clearedSession, status: 'unverified', user: cachedUser }),
  sessionExpired: () => set({ ...clearedSession, status: 'expired' }),
  signedOut: () => set({ ...clearedSession, status: 'signedOut' }),
}));

/** Puts the store back to its launch state. For tests. */
export function resetAuthStore(): void {
  useAuthStore.setState(initialAuthState);
}

/** Which part of the app the root layout should show. */
export type SessionRoute =
  'loading' | 'auth' | 'unverified' | 'verification' | 'onboarding' | 'app';

/**
 * Decides the screen group from the session (used by the root navigation gate, SS-100):
 * signed out or expired → auth; unreachable at launch → unverified; membership not approved →
 * verification; approved but setup unfinished → onboarding; otherwise → the app.
 */
export function selectSessionRoute(state: AuthState): SessionRoute {
  switch (state.status) {
    case 'restoring':
      return 'loading';
    case 'signedOut':
    case 'expired':
      return 'auth';
    case 'unverified':
      return 'unverified';
    case 'signedIn':
      if (!state.user) return 'loading';
      if (state.user.membershipStatus !== 'APPROVED') return 'verification';
      if (!state.user.onboardingCompleted) return 'onboarding';
      return 'app';
  }
}

/**
 * True when the signed-in person currently has `permission` (UI hint only; the server decides).
 * False unless signed in, so an unverified read-only session never shows privileged UI.
 */
export function selectHasPermission(permission: Permission) {
  return (state: AuthState): boolean =>
    state.status === 'signedIn' && (state.user?.permissions.includes(permission) ?? false);
}

/** True for Treasurer, Vice President and President. False unless signed in. */
export function selectIsExecutive(state: AuthState): boolean {
  return state.status === 'signedIn' && state.user !== null && isExecutiveRole(state.user.role);
}
