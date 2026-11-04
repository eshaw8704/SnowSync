import type { MeResponse, Permission, UserRole } from '@snowsync/shared';
import { useAuthStore } from '../../src/state/authStore';

/**
 * Puts the auth store in a signed-in state for a screen test. The permission selectors only
 * answer true while status is 'signedIn', so tests must set both the status and the user.
 */
export function signInAs(
  options: {
    role?: UserRole;
    permissions?: Permission[];
    displayName?: string;
  } = {},
): MeResponse {
  const user: MeResponse = {
    id: 'user-1',
    email: 'jacob@csus.edu',
    displayName: options.displayName ?? 'Jacob Stevens',
    role: options.role ?? 'MEMBER',
    membershipStatus: 'APPROVED',
    onboardingCompleted: true,
    permissions: options.permissions ?? [],
  };
  useAuthStore.setState({ status: 'signedIn', user, accessToken: 'test-token' });
  return user;
}
