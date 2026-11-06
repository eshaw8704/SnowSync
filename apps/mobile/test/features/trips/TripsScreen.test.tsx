import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiClientError } from '../../../src/api/apiClient';
import { TripsScreen } from '../../../src/features/trips/TripsScreen';
import { listTrips } from '../../../src/features/trips/tripsApi';
import { resetAuthStore } from '../../../src/state/authStore';
import { signInAs } from '../../helpers/auth';
import { HEAVENLY } from './fixtures';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: jest.fn() },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('../../../src/features/trips/tripsApi', () => ({
  listTrips: jest.fn(),
  getTrip: jest.fn(),
}));

describe('TripsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
  });

  it('lists available trips with the phase and my status as separate badges', async () => {
    signInAs();
    jest.mocked(listTrips).mockResolvedValue([HEAVENLY]);
    render(<TripsScreen />);
    expect(await screen.findByText('Heavenly club day')).toBeTruthy();
    expect(listTrips).toHaveBeenCalledWith('available');
    expect(screen.getByText('$50 per member · 8 spots left')).toBeTruthy();
    expect(screen.getByLabelText('TRIP: Registration open')).toBeTruthy();
    expect(screen.getByLabelText('YOU: Not registered')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open' }));
    expect(router.push).toHaveBeenCalledWith('/trip/trip-heavenly');
  });

  it('shows the catalog empty state for each group and switches groups', async () => {
    signInAs();
    jest.mocked(listTrips).mockResolvedValue([]);
    render(<TripsScreen />);
    expect(await screen.findByText('No trips open')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'My trips' }));
    expect(await screen.findByText('No registrations yet')).toBeTruthy();
    expect(listTrips).toHaveBeenLastCalledWith('mine');
    fireEvent.press(screen.getByRole('button', { name: 'Browse available trips' }));
    expect(await screen.findByText('No trips open')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Created' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create trip' })).toBeNull();
  });

  it('gives officers the Created group and a Create trip button', async () => {
    signInAs({ role: 'OFFICER', permissions: ['MANAGE_TRIPS'] });
    jest.mocked(listTrips).mockResolvedValue([]);
    render(<TripsScreen />);
    fireEvent.press(await screen.findByRole('tab', { name: 'Created' }));
    expect(await screen.findByText('No created trips')).toBeTruthy();
    fireEvent.press(screen.getAllByRole('button', { name: 'Create trip' })[0]!);
    expect(router.push).toHaveBeenCalledWith('/trip/create');
  });

  it('shows a network error with a retry', async () => {
    signInAs();
    jest
      .mocked(listTrips)
      .mockRejectedValueOnce(new ApiClientError({ code: 'NETWORK_ERROR', message: 'offline' }));
    jest.mocked(listTrips).mockResolvedValueOnce([HEAVENLY]);
    render(<TripsScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Heavenly club day')).toBeTruthy();
  });
});
