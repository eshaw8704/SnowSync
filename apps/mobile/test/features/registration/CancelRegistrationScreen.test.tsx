import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiClientError } from '../../../src/api/apiClient';
import { CancelRegistrationScreen } from '../../../src/features/registration/CancelRegistrationScreen';
import { cancelRegistration } from '../../../src/features/registration/registrationApi';
import { getTrip } from '../../../src/features/trips/tripsApi';
import { HEAVENLY_DETAIL, MY_REGISTRATION } from '../trips/fixtures';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ tripId: 'trip-heavenly' }),
}));
jest.mock('../../../src/features/trips/tripsApi', () => ({ getTrip: jest.fn() }));
jest.mock('../../../src/features/registration/registrationApi', () => ({
  cancelRegistration: jest.fn(),
}));

describe('CancelRegistrationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getTrip).mockResolvedValue(HEAVENLY_DETAIL);
  });

  it('explains what cancelling does and promises no refund', async () => {
    render(<CancelRegistrationScreen />);
    expect(await screen.findByRole('header', { name: 'Cancel your registration?' })).toBeTruthy();
    expect(screen.getByLabelText('Status: CANCEL')).toBeTruthy();
    expect(screen.getByText(/no automatic refund is promised/)).toBeTruthy();
    expect(screen.getByLabelText('Spot: Released')).toBeTruthy();
    expect(screen.getByLabelText('Refund: Contact treasurer')).toBeTruthy();
  });

  it('cancels and shows the cancelled result', async () => {
    jest.mocked(cancelRegistration).mockResolvedValue({
      cancelled: true,
      registration: { ...MY_REGISTRATION, chargeStatus: 'VOID' },
    });
    render(<CancelRegistrationScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Cancel registration' }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        '/trip/registration-result/trip-heavenly?outcome=cancelled',
      ),
    );
  });

  it('keeps the spot and leaves with Keep my spot', async () => {
    render(<CancelRegistrationScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Keep my spot' }));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(cancelRegistration).not.toHaveBeenCalled();
  });

  it('explains when cancelling is no longer allowed', async () => {
    jest
      .mocked(cancelRegistration)
      .mockRejectedValue(
        new ApiClientError(
          { code: 'CONFLICT', message: 'no', details: { reason: 'CANCEL_NOT_ALLOWED' } },
          409,
        ),
      );
    render(<CancelRegistrationScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Cancel registration' }));
    expect(await screen.findByText("You can't cancel now")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel registration' })).toBeDisabled();
  });

  it('keeps the spot and offers a retry when the network fails', async () => {
    jest
      .mocked(cancelRegistration)
      .mockRejectedValue(new ApiClientError({ code: 'NETWORK_ERROR', message: 'offline' }));
    render(<CancelRegistrationScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Cancel registration' }));
    expect(await screen.findByText(/Your spot is still saved/)).toBeTruthy();
  });

  it('goes back to Trip detail instead of claiming a cancellation the server did not make', async () => {
    jest.mocked(cancelRegistration).mockResolvedValue({
      cancelled: false,
      registration: { ...MY_REGISTRATION, participation: 'CHECKED_IN' },
    });
    render(<CancelRegistrationScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Cancel registration' }));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('promises a way back only while registration is still open', async () => {
    jest
      .mocked(getTrip)
      .mockResolvedValue({ ...HEAVENLY_DETAIL, registrationClosesAt: '2099-01-01T00:00:00.000Z' });
    const { unmount } = render(<CancelRegistrationScreen />);
    expect(await screen.findByText(/You can register again while spots remain/)).toBeTruthy();
    unmount();

    jest
      .mocked(getTrip)
      .mockResolvedValue({ ...HEAVENLY_DETAIL, registrationClosesAt: '2020-01-01T00:00:00.000Z' });
    render(<CancelRegistrationScreen />);
    expect(
      await screen.findByText(/Registration has closed, so you can't register again yourself/),
    ).toBeTruthy();
    expect(screen.queryByText(/You can register again/)).toBeNull();
  });
});
