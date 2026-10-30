import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  decideMembership,
  fetchPendingMemberships,
} from '../../../src/features/officer/approvalsApi';
import { ApprovalsScreen } from '../../../src/features/officer/ApprovalsScreen';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

jest.mock('../../../src/features/officer/approvalsApi', () => ({
  fetchPendingMemberships: jest.fn(),
  decideMembership: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  Stack: { Screen: () => null },
}));

const riley = {
  userId: 'r1',
  displayName: 'Riley Pending',
  email: 'riley@csus.edu',
  requestedAt: '2027-01-05T10:00:00.000Z',
};

function signInWith(permissions: ('REVIEW_MEMBERSHIPS' | 'CREATE_CLUB_CODES')[]) {
  useAuthStore.setState({ status: 'signedIn' });
  useAuthStore.getState().userLoaded({
    id: 'o1',
    email: 'o@example.com',
    displayName: 'Olivia',
    role: 'OFFICER',
    membershipStatus: 'APPROVED',
    onboardingCompleted: true,
    permissions,
  });
}

describe('ApprovalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
    jest.mocked(fetchPendingMemberships).mockResolvedValue([riley]);
    jest.mocked(decideMembership).mockResolvedValue({ decided: true });
  });

  it('shows Forbidden without REVIEW_MEMBERSHIPS', () => {
    signInWith([]);
    render(<ApprovalsScreen />);
    expect(screen.getByText("You don't have permission")).toBeTruthy();
    expect(fetchPendingMemberships).not.toHaveBeenCalled();
  });

  it('approves after confirmation', async () => {
    signInWith(['REVIEW_MEMBERSHIPS']);
    render(<ApprovalsScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.press(screen.getByRole('button', { name: 'Approve membership' }));
    expect(
      await screen.findByText('Riley Pending approved. They can now complete member onboarding.'),
    ).toBeTruthy();
    expect(decideMembership).toHaveBeenCalledWith('r1', { decision: 'APPROVE' });
  }, 10000);

  it('shows an error when approval fails', async () => {
    signInWith(['REVIEW_MEMBERSHIPS']);
    jest.mocked(decideMembership).mockRejectedValueOnce(new Error('Network error'));

    render(<ApprovalsScreen />);

    fireEvent.press(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.press(screen.getByRole('button', { name: 'Approve membership' }));

    expect(await screen.findByText(/Could not save the decision\. Try again\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve membership' })).toBeTruthy();
  });

  it('removes a request already handled by another officer', async () => {
    signInWith(['REVIEW_MEMBERSHIPS']);
    jest.mocked(fetchPendingMemberships).mockResolvedValueOnce([riley]).mockResolvedValueOnce([]);
    jest.mocked(decideMembership).mockRejectedValueOnce(new Error('Network error'));

    render(<ApprovalsScreen />);

    fireEvent.press(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.press(screen.getByRole('button', { name: 'Approve membership' }));

    expect(
      await screen.findByText('This membership request has already been handled.'),
    ).toBeTruthy();
    expect(await screen.findByText('No pending requests')).toBeTruthy();
  });

  it('requires a reason to reject', async () => {
    signInWith(['REVIEW_MEMBERSHIPS']);
    render(<ApprovalsScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Reject' }));
    fireEvent.press(screen.getByRole('button', { name: 'Reject request' }));
    expect(await screen.findByText('Give a reason the requester will see.')).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText('Rejection reason'),
      'Not a current Sac State student',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Reject request' }));
    await waitFor(() =>
      expect(decideMembership).toHaveBeenCalledWith('r1', {
        decision: 'REJECT',
        reason: 'Not a current Sac State student',
      }),
    );
  });

  it('shows an empty state when nobody is waiting', async () => {
    signInWith(['REVIEW_MEMBERSHIPS']);
    jest.mocked(fetchPendingMemberships).mockResolvedValue([]);
    render(<ApprovalsScreen />);
    expect(await screen.findByText('No pending requests')).toBeTruthy();
  });
});
