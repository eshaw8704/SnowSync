import type { MeResponse } from '@snowsync/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { ApiClientError } from '../../../src/api/apiClient';
import { loadMe, signOut } from '../../../src/features/auth/sessionManager';
import { ClubCodeScreen } from '../../../src/features/membership/ClubCodeScreen';
import {
  fetchMembershipStatus,
  redeemClubCode,
} from '../../../src/features/membership/membershipApi';
import { VerificationScreen } from '../../../src/features/membership/VerificationScreen';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

jest.mock('../../../src/features/membership/membershipApi', () => ({
  fetchMembershipStatus: jest.fn(),
  redeemClubCode: jest.fn(),
}));
jest.mock('../../../src/features/auth/sessionManager', () => ({
  loadMe: jest.fn(),
  signOut: jest.fn(),
}));
const mockedStatus = jest.mocked(fetchMembershipStatus);
const mockedRedeem = jest.mocked(redeemClubCode);
const mockedLoadMe = jest.mocked(loadMe);

const pendingUser: MeResponse = {
  id: 'u1',
  email: 'jacob@csus.edu',
  displayName: 'Jacob Stevens',
  role: 'MEMBER',
  membershipStatus: 'PENDING_APPROVAL',
  onboardingCompleted: false,
  permissions: [],
};
const routes = { index: VerificationScreen, 'club-code': ClubCodeScreen };
const status = (value: string, rejectionReason: string | null = null) =>
  ({ status: value, requestedAt: '2027-01-05T10:00:00.000Z', rejectionReason }) as never;

describe('membership verification', () => {
  beforeEach(() => {
    resetAuthStore();
    useAuthStore.getState().userLoaded(pendingUser);
    jest.clearAllMocks();
  });

  it('shows pending with refresh, club code and sign out', async () => {
    mockedStatus.mockResolvedValue(status('PENDING_APPROVAL'));
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText("You're on the list.")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Refresh approval status' }));
    await waitFor(() => expect(mockedStatus).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("You're on the list.")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalled();
  });

  it('shows the rejection reason', async () => {
    mockedStatus.mockResolvedValue(status('REJECTED', 'Not a current Sac State student'));
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Reason: Not a current Sac State student')).toBeTruthy();
  });

  it('never shows a load error as a rejection', async () => {
    mockedStatus.mockRejectedValue(new ApiClientError({ code: 'NETWORK_ERROR', message: 'x' }));
    renderRouter(routes, { initialUrl: '/' });
    expect(
      await screen.findByText(
        "This isn't a rejection. Your account is safe. Try again in a moment.",
      ),
    ).toBeTruthy();
  });

  it('moves on to setup when approved', async () => {
    mockedStatus.mockResolvedValue(status('APPROVED'));
    mockedLoadMe.mockResolvedValue(pendingUser);
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByRole('button', { name: 'Set up my profile' }));
    expect(mockedLoadMe).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Set up my profile' })).not.toBeBusy(),
    );
  });

  it('redeems a club code and reloads the user', async () => {
    mockedRedeem.mockResolvedValue(status('APPROVED'));
    mockedLoadMe.mockResolvedValue(pendingUser);
    renderRouter(routes, { initialUrl: '/club-code' });
    fireEvent.changeText(screen.getByLabelText('Club code'), 'abcd2345');
    fireEvent.press(screen.getByRole('button', { name: 'Verify code' }));
    await waitFor(() => expect(mockedLoadMe).toHaveBeenCalled());
    expect(mockedRedeem).toHaveBeenCalledWith('ABCD2345');
  });

  it('shows the server reason for a used code', async () => {
    mockedRedeem.mockRejectedValue(
      new ApiClientError(
        {
          code: 'CONFLICT',
          message: 'That code has already been used. Ask an officer for a new one.',
          details: { reason: 'CODE_USED' },
        },
        409,
      ),
    );
    renderRouter(routes, { initialUrl: '/club-code' });
    fireEvent.changeText(screen.getByLabelText('Club code'), 'ABCD2345');
    fireEvent.press(screen.getByRole('button', { name: 'Verify code' }));
    expect(
      await screen.findByText('That code has already been used. Ask an officer for a new one.'),
    ).toBeTruthy();
  });
});
