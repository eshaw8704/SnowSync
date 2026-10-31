import { fireEvent, render, screen } from '@testing-library/react-native';
import { ClubCodeCard } from '../../../src/features/officer/ClubCodeCard';
import { createClubCode } from '../../../src/features/officer/clubCodesApi';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

jest.mock('../../../src/features/officer/clubCodesApi', () => ({ createClubCode: jest.fn() }));

function signInWith(permissions: 'CREATE_CLUB_CODES'[]) {
  useAuthStore.getState().userLoaded({
    id: 'o1',
    email: 'o@example.com',
    displayName: 'Olivia',
    role: 'OFFICER',
    membershipStatus: 'APPROVED',
    onboardingCompleted: true,
    permissions,
  });
  useAuthStore.setState({ status: 'signedIn' });
}

describe('ClubCodeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
  });

  it('renders nothing without CREATE_CLUB_CODES', () => {
    signInWith([]);
    render(<ClubCodeCard />);
    expect(screen.queryByText('One-time club code')).toBeNull();
  });

  it('generates a code and shows it once', async () => {
    signInWith(['CREATE_CLUB_CODES']);
    jest
      .mocked(createClubCode)
      .mockResolvedValue({ code: 'ABCD2345', expiresAt: '2027-01-12T10:00:00.000Z' });
    render(<ClubCodeCard />);
    fireEvent.press(screen.getByRole('button', { name: 'Generate club code' }));
    expect(await screen.findByText(/ABCD2345/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByText(/ABCD2345/)).toBeNull();
  });
});
