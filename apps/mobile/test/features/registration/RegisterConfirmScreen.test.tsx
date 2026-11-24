import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiClientError } from '../../../src/api/apiClient';
import { RegisterConfirmScreen } from '../../../src/features/registration/RegisterConfirmScreen';
import { register } from '../../../src/features/registration/registrationApi';
import { getTrip } from '../../../src/features/trips/tripsApi';
import { HEAVENLY_DETAIL, MY_REGISTRATION } from '../trips/fixtures';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ tripId: 'trip-heavenly' }),
}));
jest.mock('../../../src/features/trips/tripsApi', () => ({ getTrip: jest.fn() }));
jest.mock('../../../src/features/registration/registrationApi', () => ({ register: jest.fn() }));

function conflict(reason: string) {
  return new ApiClientError({ code: 'CONFLICT', message: 'no', details: { reason } }, 409);
}

describe('RegisterConfirmScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getTrip).mockResolvedValue(HEAVENLY_DETAIL);
  });

  it('asks to reserve the spot and says sharing and chat stay off', async () => {
    render(<RegisterConfirmScreen />);
    expect(await screen.findByRole('header', { name: 'Reserve your spot?' })).toBeTruthy();
    expect(
      screen.getByText(
        'Heavenly · Jan 30 · $50 · 8 spots remain. Registering does not enable live sharing or chat.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Trip: Heavenly club day')).toBeTruthy();
    expect(screen.getByLabelText('Price: $50')).toBeTruthy();
  });

  it('registers and shows the confirmed result', async () => {
    jest.mocked(register).mockResolvedValue({
      alreadyRegistered: false,
      registration: { ...MY_REGISTRATION, participation: 'REGISTERED' },
    });
    render(<RegisterConfirmScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Confirm registration' }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        '/trip/registration-result/trip-heavenly?outcome=registered',
      ),
    );
  });

  it('shows the duplicate-blocked result when already registered', async () => {
    jest.mocked(register).mockResolvedValue({
      alreadyRegistered: true,
      registration: { ...MY_REGISTRATION, participation: 'REGISTERED' },
    });
    render(<RegisterConfirmScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Confirm registration' }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        '/trip/registration-result/trip-heavenly?outcome=already',
      ),
    );
  });

  it.each([
    ['TRIP_FULL', 'full'],
    ['REGISTRATION_CLOSED', 'closed'],
  ])('routes %s to the %s result', async (reason, outcome) => {
    jest.mocked(register).mockRejectedValue(conflict(reason));
    render(<RegisterConfirmScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Confirm registration' }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        `/trip/registration-result/trip-heavenly?outcome=${outcome}`,
      ),
    );
  });

  it('retries a failed send with the same opId', async () => {
    jest
      .mocked(register)
      .mockRejectedValueOnce(new ApiClientError({ code: 'NETWORK_ERROR', message: 'offline' }))
      .mockResolvedValueOnce({
        alreadyRegistered: false,
        registration: { ...MY_REGISTRATION, participation: 'REGISTERED' },
      });
    render(<RegisterConfirmScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Confirm registration' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(2));
    const [first, second] = jest.mocked(register).mock.calls;
    expect(second![1]).toBe(first![1]);
  });

  it('never confirms a spot when the retry finds the registration was cancelled since', async () => {
    jest
      .mocked(register)
      .mockRejectedValueOnce(new ApiClientError({ code: 'NETWORK_ERROR', message: 'offline' }))
      .mockResolvedValueOnce({
        alreadyRegistered: false,
        registration: { ...MY_REGISTRATION, participation: 'NOT_REGISTERED' },
      });
    render(<RegisterConfirmScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Confirm registration' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('backs out with Not now without registering', async () => {
    render(<RegisterConfirmScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Not now' }));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(register).not.toHaveBeenCalled();
  });
});
