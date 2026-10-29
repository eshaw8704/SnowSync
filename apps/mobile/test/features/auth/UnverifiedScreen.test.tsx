import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import UnverifiedSessionScreen from '../../../app/unverified';
import { restoreSession, signOut } from '../../../src/features/auth/sessionManager';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

jest.mock('../../../src/features/auth/sessionManager', () => ({
  restoreSession: jest.fn(() => Promise.resolve()),
  signOut: jest.fn(() => Promise.resolve()),
}));

describe('Unverified session screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
  });

  it('shows the cached profile read-only and offers retry and sign out', async () => {
    useAuthStore.getState().sessionUnverified({
      id: 'u1',
      email: 'maya@csus.edu',
      displayName: 'Maya Stevens',
      role: 'OFFICER',
      membershipStatus: 'APPROVED',
      onboardingCompleted: true,
      permissions: [],
    });
    render(<UnverifiedSessionScreen />);
    expect(screen.getByText('Unable to verify your session')).toBeTruthy();
    expect(screen.getByText('Maya Stevens')).toBeTruthy();
    expect(screen.getByText('Officer · maya@csus.edu')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry verification' }));
    await waitFor(() => expect(restoreSession).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('works without a cached profile', () => {
    useAuthStore.getState().sessionUnverified(null);
    render(<UnverifiedSessionScreen />);
    expect(screen.queryByText('SAVED ON THIS PHONE (READ-ONLY)')).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry verification' })).toBeTruthy();
  });
});
