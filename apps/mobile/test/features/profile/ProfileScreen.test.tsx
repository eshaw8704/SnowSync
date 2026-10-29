import type { MeResponse } from '@snowsync/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { signOut } from '../../../src/features/auth/sessionManager';
import { ProfileScreen } from '../../../src/features/profile/ProfileScreen';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../../src/features/auth/sessionManager', () => ({
  signOut: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../../src/features/devStatus/ServerStatusCard', () => ({
  ServerStatusCard: () => null,
}));

function signInAs(role: MeResponse['role'], permissions: MeResponse['permissions']) {
  useAuthStore.setState({ status: 'signedIn' });
  useAuthStore.getState().userLoaded({
    id: 'u1',
    email: 'jacob@csus.edu',
    displayName: 'Jacob Stevens',
    role,
    membershipStatus: 'APPROVED',
    onboardingCompleted: true,
    permissions,
  });
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
  });

  it('shows no officer tools to a member', () => {
    signInAs('MEMBER', []);
    render(<ProfileScreen />);
    expect(screen.getByText('Member · Approved')).toBeTruthy();
    expect(screen.queryByText('OFFICER TOOLS')).toBeNull();
  });

  it('shows approvals to officers and role permissions only to executives', () => {
    signInAs('OFFICER', ['REVIEW_MEMBERSHIPS']);
    const { unmount } = render(<ProfileScreen />);
    expect(screen.getByRole('button', { name: 'Membership approvals' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Role permissions' })).toBeNull();
    unmount();
    signInAs('PRESIDENT', ['REVIEW_MEMBERSHIPS']);
    render(<ProfileScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Role permissions' }));
    expect(router.push).toHaveBeenCalledWith('/officer/permissions');
  });

  it('confirms before signing out', () => {
    signInAs('MEMBER', []);
    render(<ProfileScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText('Sign out of SnowSync?')).toBeTruthy();
    fireEvent.press(screen.getAllByRole('button', { name: 'Sign out' }).at(-1)!);
    expect(signOut).toHaveBeenCalled();
  });
});
