import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { ApiClientError } from '../../../src/api/apiClient';
import { ForgotPasswordScreen } from '../../../src/features/auth/ForgotPasswordScreen';
import { InstructionsSentScreen } from '../../../src/features/auth/InstructionsSentScreen';
import { requestPasswordReset, resetPassword } from '../../../src/features/auth/passwordResetApi';
import { ResetPasswordScreen } from '../../../src/features/auth/ResetPasswordScreen';
import { ResetSuccessScreen } from '../../../src/features/auth/ResetSuccessScreen';

jest.mock('../../../src/features/auth/passwordResetApi', () => ({
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
}));
const mockedRequest = jest.mocked(requestPasswordReset);
const mockedReset = jest.mocked(resetPassword);

const routes = {
  'forgot-password': ForgotPasswordScreen,
  'instructions-sent': InstructionsSentScreen,
  'reset-password': ResetPasswordScreen,
  'reset-success': ResetSuccessScreen,
  'sign-in': () => null,
};

describe('password reset screens', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedReset.mockReset();
  });

  it('sends instructions and shows the same confirmation for any email', async () => {
    mockedRequest.mockResolvedValue({ sent: true });
    renderRouter(routes, { initialUrl: '/forgot-password' });
    fireEvent.changeText(screen.getByLabelText('Sac State email'), 'Jacob@csus.edu');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset instructions' }));
    expect(await screen.findByText(/If an account exists for jacob@csus.edu/)).toBeTruthy();
    expect(mockedRequest).toHaveBeenCalledWith('jacob@csus.edu');
  });

  it('resets with the token from the link and shows success', async () => {
    mockedReset.mockResolvedValue({ reset: true });
    renderRouter(routes, { initialUrl: '/reset-password?token=abc123' });
    fireEvent.changeText(screen.getByLabelText('New password'), 'Brand-New-Pass-2027');
    fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'Brand-New-Pass-2027');
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('Password reset.')).toBeTruthy();
    expect(mockedReset).toHaveBeenCalledWith('abc123', 'Brand-New-Pass-2027');
  });

  it('enforces 12 characters and matching passwords', async () => {
    renderRouter(routes, { initialUrl: '/reset-password?token=abc123' });
    fireEvent.changeText(screen.getByLabelText('New password'), 'short');
    fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'other');
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('Use at least 12 characters.')).toBeTruthy();
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(mockedReset).not.toHaveBeenCalled();
  });

  it('explains an expired or used link', async () => {
    mockedReset.mockRejectedValue(
      new ApiClientError(
        { code: 'VALIDATION_FAILED', message: 'x', details: { reason: 'RESET_TOKEN_INVALID' } },
        400,
      ),
    );
    renderRouter(routes, { initialUrl: '/reset-password?token=used' });
    fireEvent.changeText(screen.getByLabelText('New password'), 'Brand-New-Pass-2027');
    fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'Brand-New-Pass-2027');
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('Link invalid or expired')).toBeTruthy();
  });
});
