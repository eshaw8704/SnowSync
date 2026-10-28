import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { ApiClientError } from '../../../src/api/apiClient';
import { logIn } from '../../../src/features/auth/loginApi';
import { SignInScreen } from '../../../src/features/auth/SignInScreen';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

jest.mock('../../../src/features/auth/loginApi', () => ({ logIn: jest.fn() }));
const mockedLogIn = jest.mocked(logIn);

const session = {
  accessToken: 'a',
  accessTokenExpiresAt: '2026-10-20T10:15:00.000Z',
  refreshToken: 'r',
  refreshTokenExpiresAt: '2026-11-19T10:00:00.000Z',
};

function renderSignIn() {
  renderRouter(
    {
      'sign-in': SignInScreen,
      'forgot-password': () => <Text>Forgot password screen</Text>,
      'sign-up': () => <Text>Sign up screen</Text>,
    },
    { initialUrl: '/sign-in' },
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.changeText(screen.getByLabelText('Sac State email'), email);
  fireEvent.changeText(screen.getByLabelText('Password'), password);
  fireEvent.press(screen.getByRole('button', { name: 'Sign in with email' }));
}

describe('SignInScreen', () => {
  beforeEach(() => {
    resetAuthStore();
    useAuthStore.getState().signedOut();
    mockedLogIn.mockReset();
  });

  it('validates fields before calling the server', async () => {
    renderSignIn();
    fillAndSubmit('not-an-email', '');
    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(mockedLogIn).not.toHaveBeenCalled();
  });

  it('stores the session on success', async () => {
    mockedLogIn.mockResolvedValue(session);
    renderSignIn();
    fillAndSubmit('Jacob@csus.edu', 'Powder-Day-2027');
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedIn'));
    expect(mockedLogIn).toHaveBeenCalledWith({
      email: 'jacob@csus.edu',
      password: 'Powder-Day-2027',
    });
  });

  it('shows one generic dialog for wrong credentials', async () => {
    mockedLogIn.mockRejectedValue(new ApiClientError({ code: 'UNAUTHORIZED', message: 'x' }, 401));
    renderSignIn();
    fillAndSubmit('jacob@csus.edu', 'wrong');
    expect(await screen.findByText('Email or password is incorrect')).toBeTruthy();
  });

  it('keeps the email after a network failure', async () => {
    mockedLogIn.mockRejectedValue(new ApiClientError({ code: 'NETWORK_ERROR', message: 'x' }));
    renderSignIn();
    fillAndSubmit('jacob@csus.edu', 'Powder-Day-2027');
    expect(await screen.findByText('Sign-in could not connect')).toBeTruthy();
    expect(screen.getByLabelText('Sac State email').props.value).toBe('jacob@csus.edu');
  });

  it('explains the 15-minute lock and offers a reset', async () => {
    mockedLogIn.mockRejectedValue(new ApiClientError({ code: 'RATE_LIMITED', message: 'x' }, 429));
    renderSignIn();
    fillAndSubmit('jacob@csus.edu', 'wrong');
    expect(
      await screen.findByText(
        'Email sign-in is locked for 15 minutes. Reset your password to get back in sooner.',
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('Forgot password screen')).toBeTruthy();
  });

  it('tells the person when their session expired', () => {
    useAuthStore.getState().sessionExpired();
    renderSignIn();
    expect(screen.getByText('Your session expired')).toBeTruthy();
  });
});
