import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiClientError } from '../../../src/api/apiClient';
import { TripDetailScreen } from '../../../src/features/trips/TripDetailScreen';
import { getMyRegistration } from '../../../src/features/registration/registrationApi';
import { getTrip } from '../../../src/features/trips/tripsApi';
import { resetAuthStore } from '../../../src/state/authStore';
import { signInAs } from '../../helpers/auth';
import { HEAVENLY_DETAIL, MY_REGISTRATION } from './fixtures';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({ tripId: 'trip-heavenly' }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
    Stack: { Screen: () => null },
  };
});
jest.mock('../../../src/features/trips/tripsApi', () => ({
  listTrips: jest.fn(),
  getTrip: jest.fn(),
}));
jest.mock('../../../src/features/registration/registrationApi', () => ({
  getMyRegistration: jest.fn(),
  register: jest.fn(),
}));

describe('TripDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
    jest.mocked(getMyRegistration).mockResolvedValue(MY_REGISTRATION);
  });

  it('shows schedule, resort, cost, spots and officers with separate badges', async () => {
    signInAs();
    jest.mocked(getTrip).mockResolvedValue({ ...HEAVENLY_DETAIL, myParticipation: 'REGISTERED' });
    render(<TripDetailScreen />);
    expect(await screen.findByText('Sat, Jan 30, 2027')).toBeTruthy();
    expect(screen.getByText('8:00 AM–4:00 PM')).toBeTruthy();
    expect(screen.getByText('base lodge · 500 m check-in boundary')).toBeTruthy();
    expect(screen.getByText('Check-in window: 7:30 AM–8:00 AM')).toBeTruthy();
    expect(screen.getByText('$50 per member')).toBeTruthy();
    expect(screen.getByText('8 spots left · 16 of 24 registered')).toBeTruthy();
    expect(screen.getByText('Olivia Officer · Officer')).toBeTruthy();
    expect(screen.getByLabelText('TRIP: Registration open')).toBeTruthy();
    expect(screen.getByLabelText('YOU: Registered')).toBeTruthy();
    expect(await screen.findByTestId('registration-panel')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Manage trip' })).toBeNull();
  });

  it('hides my participation badge on a draft trip', async () => {
    signInAs({ role: 'OFFICER', permissions: ['MANAGE_TRIPS'] });
    jest.mocked(getTrip).mockResolvedValue({ ...HEAVENLY_DETAIL, state: 'CREATED' });
    render(<TripDetailScreen />);
    expect(await screen.findByLabelText('TRIP: Created')).toBeTruthy();
    expect(screen.queryByLabelText('YOU: Not registered')).toBeNull();
  });

  it('offers officers the management screen', async () => {
    signInAs({ role: 'OFFICER', permissions: ['MANAGE_TRIPS'] });
    jest.mocked(getTrip).mockResolvedValue(HEAVENLY_DETAIL);
    render(<TripDetailScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Manage trip' }));
    expect(router.push).toHaveBeenCalledWith('/trip/manage/trip-heavenly');
  });

  it('offers officers with roster permission the roster', async () => {
    signInAs({ role: 'OFFICER', permissions: ['MANAGE_ROSTER'] });
    jest.mocked(getTrip).mockResolvedValue(HEAVENLY_DETAIL);
    render(<TripDetailScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'View roster' }));
    expect(router.push).toHaveBeenCalledWith('/trip/roster/trip-heavenly');
  });

  it('explains a trip that cannot be found', async () => {
    signInAs();
    jest
      .mocked(getTrip)
      .mockRejectedValue(
        new ApiClientError({ code: 'NOT_FOUND', message: "We can't find this trip." }, 404),
      );
    render(<TripDetailScreen />);
    expect(await screen.findByText("We can't find this trip")).toBeTruthy();
  });
});
