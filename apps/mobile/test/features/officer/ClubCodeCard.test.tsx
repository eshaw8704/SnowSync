import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { ClubCodeCard } from '../../../src/features/officer/ClubCodeCard';
import { createClubCode } from '../../../src/features/officer/clubCodesApi';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

jest.mock('../../../src/features/officer/clubCodesApi', () => ({
  createClubCode: jest.fn(),
}));

function signInWith(permissions: 'CREATE_CLUB_CODES'[], role: 'OFFICER' | 'MEMBER' = 'OFFICER') {
  useAuthStore.getState().userLoaded({
    id: 'o1',
    email: 'o@example.com',
    displayName: 'Olivia',
    role,
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

  it('hides club codes from members even with CREATE_CLUB_CODES', () => {
    signInWith(['CREATE_CLUB_CODES'], 'MEMBER');
    render(<ClubCodeCard />);

    expect(screen.queryByText('One-time club code')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Generate club code' })).toBeNull();
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

  it('copies the generated code to the clipboard', async () => {
    signInWith(['CREATE_CLUB_CODES']);
    jest
      .mocked(createClubCode)
      .mockResolvedValue({ code: 'ABCD2345', expiresAt: '2027-01-12T10:00:00.000Z' });
    jest.mocked(Clipboard.setStringAsync).mockResolvedValue(true);

    render(<ClubCodeCard />);

    fireEvent.press(screen.getByRole('button', { name: 'Generate club code' }));
    expect(await screen.findByText(/ABCD2345/)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Copy code' }));

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('ABCD2345');
    });

    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeTruthy();
  });

  it('shows an error when copying fails', async () => {
    signInWith(['CREATE_CLUB_CODES']);
    jest
      .mocked(createClubCode)
      .mockResolvedValue({ code: 'ABCD2345', expiresAt: '2027-01-12T10:00:00.000Z' });
    jest.mocked(Clipboard.setStringAsync).mockResolvedValue(false);

    render(<ClubCodeCard />);

    fireEvent.press(screen.getByRole('button', { name: 'Generate club code' }));
    expect(await screen.findByText(/ABCD2345/)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Copy code' }));

    expect(await screen.findByText('Could not copy the code. Try again.')).toBeTruthy();
  });
});
