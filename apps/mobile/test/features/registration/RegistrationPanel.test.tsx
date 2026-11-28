import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { RegistrationPanel } from '../../../src/features/registration/RegistrationPanel';
import { getMyRegistration } from '../../../src/features/registration/registrationApi';
import { HEAVENLY_DETAIL, MY_REGISTRATION } from '../trips/fixtures';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: jest.fn() },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('../../../src/features/registration/registrationApi', () => ({
  getMyRegistration: jest.fn(),
}));

// The fixture trip's registration closes Jan 29, 2027; keep "now" before that.
const OPEN_TRIP = { ...HEAVENLY_DETAIL, registrationClosesAt: '2099-01-01T00:00:00.000Z' };

describe('RegistrationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the confirm screen from Register for trip', async () => {
    jest.mocked(getMyRegistration).mockResolvedValue(MY_REGISTRATION);
    render(<RegistrationPanel trip={OPEN_TRIP} />);
    expect(await screen.findByText(/Location sharing and chat remain disabled/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Register for trip' }));
    expect(router.push).toHaveBeenCalledWith('/trip/register/trip-heavenly');
  });

  it('tells screen readers the spots left with the right wording for one spot', async () => {
    jest.mocked(getMyRegistration).mockResolvedValue(MY_REGISTRATION);
    render(<RegistrationPanel trip={{ ...OPEN_TRIP, registeredCount: 23 }} />);
    expect(await screen.findByHintText('1 spot left')).toBeTruthy();
  });

  it('shows the full state without a Register button', async () => {
    jest.mocked(getMyRegistration).mockResolvedValue(MY_REGISTRATION);
    render(<RegistrationPanel trip={{ ...OPEN_TRIP, registeredCount: 24 }} />);
    expect(await screen.findByText('This trip is full')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Register for trip' })).toBeNull();
  });

  it('shows my registration with its payment status', async () => {
    jest.mocked(getMyRegistration).mockResolvedValue({
      ...MY_REGISTRATION,
      participation: 'REGISTERED',
      chargeStatus: 'UNPAID',
      chargeAmountCents: 5000,
    });
    render(<RegistrationPanel trip={OPEN_TRIP} />);
    expect(await screen.findByText("You're registered")).toBeTruthy();
    expect(screen.getByLabelText('Payment: Unpaid · $50')).toBeTruthy();
    expect(screen.getByLabelText('Check-in: 7:30 AM')).toBeTruthy();
  });

  it('offers Cancel registration only while registration is open', async () => {
    const registered = {
      ...MY_REGISTRATION,
      participation: 'REGISTERED' as const,
      chargeStatus: 'UNPAID' as const,
      chargeAmountCents: 5000,
    };
    jest.mocked(getMyRegistration).mockResolvedValue(registered);
    const { unmount } = render(<RegistrationPanel trip={OPEN_TRIP} />);
    fireEvent.press(await screen.findByRole('button', { name: 'Cancel registration' }));
    expect(router.push).toHaveBeenCalledWith('/trip/cancel-registration/trip-heavenly');
    unmount();

    render(<RegistrationPanel trip={{ ...OPEN_TRIP, state: 'CHECK_IN' }} />);
    expect(await screen.findByText("You're registered")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel registration' })).toBeNull();
  });

  it('shows how and when an officer checked me in, with lateness in words', async () => {
    jest.mocked(getMyRegistration).mockResolvedValue({
      ...MY_REGISTRATION,
      participation: 'CHECKED_IN',
      checkedInAt: '2027-01-30T16:10:00.000Z',
      checkInMethod: 'OFFICER',
      checkedInByName: 'Maya Lee',
      lateMinutes: 10,
    });
    render(<RegistrationPanel trip={{ ...OPEN_TRIP, state: 'CHECK_IN' }} />);
    expect(await screen.findByText("You're checked in")).toBeTruthy();
    expect(screen.getByLabelText('Checked in: 8:10 AM')).toBeTruthy();
    expect(screen.getByLabelText('Verified by: Maya Lee')).toBeTruthy();
    expect(screen.getByLabelText('Arrival: Late · 10 min')).toBeTruthy();
  });

  it.each([
    ['SELF', 'Method: Self check-in'],
    ['GEOFENCE', 'Method: Automatic'],
  ] as const)('describes a %s check-in without naming an officer', async (checkInMethod, label) => {
    jest.mocked(getMyRegistration).mockResolvedValue({
      ...MY_REGISTRATION,
      participation: 'CHECKED_IN',
      checkedInAt: '2027-01-30T15:50:00.000Z',
      checkInMethod,
    });
    render(<RegistrationPanel trip={{ ...OPEN_TRIP, state: 'CHECK_IN' }} />);
    expect(await screen.findByLabelText(label)).toBeTruthy();
    expect(screen.queryByLabelText(/^Verified by/)).toBeNull();
  });

  it('offers a retry when my registration cannot load', async () => {
    jest.mocked(getMyRegistration).mockRejectedValueOnce(new Error('offline'));
    jest.mocked(getMyRegistration).mockResolvedValueOnce(MY_REGISTRATION);
    render(<RegistrationPanel trip={OPEN_TRIP} />);
    fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Register for trip' })).toBeTruthy();
  });
});
