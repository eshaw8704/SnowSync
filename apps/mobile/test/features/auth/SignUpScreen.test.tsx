import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiClientError } from '../../../src/api/apiClient';
import { signUp } from '../../../src/features/auth/signupApi';
import { SignUpScreen } from '../../../src/features/auth/SignUpScreen';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

jest.mock('../../../src/features/auth/signupApi', () => ({ signUp: jest.fn() }));
jest.mock('expo-router', () => ({ Link: ({ children }: { children: unknown }) => children }));
const mockedSignUp = jest.mocked(signUp);

function fill(values: { name: string; email: string; password: string; confirm: string }) {
  fireEvent.changeText(screen.getByLabelText('Full name'), values.name);
  fireEvent.changeText(screen.getByLabelText('Sac State email'), values.email);
  fireEvent.changeText(screen.getByLabelText('Password'), values.password);
  fireEvent.changeText(screen.getByLabelText('Confirm password'), values.confirm);
  fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
}

describe('SignUpScreen', () => {
  beforeEach(() => {
    resetAuthStore();
    useAuthStore.getState().signedOut();
    mockedSignUp.mockReset();
  });

  it('shows the shared validation messages and a password mismatch', async () => {
    render(<SignUpScreen />);
    fill({ name: '', email: 'jacob@gmail.com', password: 'short', confirm: 'different' });
    expect(await screen.findByText('Use your Sac State email (@csus.edu).')).toBeTruthy();
    expect(screen.getByText('Use at least 12 characters.')).toBeTruthy();
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(mockedSignUp).not.toHaveBeenCalled();
  });

  it('creates the account and stores the session', async () => {
    mockedSignUp.mockResolvedValue({
      accessToken: 'a',
      accessTokenExpiresAt: '2026-10-20T10:15:00.000Z',
      refreshToken: 'r',
      refreshTokenExpiresAt: '2026-11-19T10:00:00.000Z',
    });
    render(<SignUpScreen />);
    fill({
      name: 'Jacob Stevens',
      email: 'jacob@csus.edu',
      password: 'Powder-Day-2027',
      confirm: 'Powder-Day-2027',
    });
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedIn'));
    expect(mockedSignUp).toHaveBeenCalledWith({
      displayName: 'Jacob Stevens',
      email: 'jacob@csus.edu',
      password: 'Powder-Day-2027',
    });
  });

  it('shows the server message for an existing email', async () => {
    mockedSignUp.mockRejectedValue(
      new ApiClientError(
        {
          code: 'CONFLICT',
          message: 'An account with this email already exists. Sign in or reset your password.',
        },
        409,
      ),
    );
    render(<SignUpScreen />);
    fill({
      name: 'Jacob',
      email: 'jacob@csus.edu',
      password: 'Powder-Day-2027',
      confirm: 'Powder-Day-2027',
    });
    expect(
      await screen.findByText(
        'An account with this email already exists. Sign in or reset your password.',
      ),
    ).toBeTruthy();
  });
});
