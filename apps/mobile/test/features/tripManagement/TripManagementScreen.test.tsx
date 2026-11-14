import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { TripManagementScreen } from '../../../src/features/tripManagement/TripManagementScreen';
import { getTrip } from '../../../src/features/trips/tripsApi';
import { resetAuthStore } from '../../../src/state/authStore';
import { signInAs } from '../../helpers/auth';
import { HEAVENLY_DETAIL } from '../trips/fixtures';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: () => ({ tripId: 'trip-heavenly' }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('../../../src/features/trips/tripsApi', () => ({
  listTrips: jest.fn(),
  getTrip: jest.fn(),
}));

describe('TripManagementScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
  });

  it('summarizes the configuration and opens the editor', async () => {
    signInAs({ role: 'OFFICER', permissions: ['MANAGE_TRIPS'] });
    jest.mocked(getTrip).mockResolvedValue(HEAVENLY_DETAIL);
    render(<TripManagementScreen />);
    expect(await screen.findByText('Heavenly club day')).toBeTruthy();
    expect(screen.getByText('16 of 24 registered')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete draft trip' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Edit configuration' }));
    expect(router.push).toHaveBeenCalledWith('/trip/edit/trip-heavenly');
  });

  it('does not offer editing once the trip is active', async () => {
    signInAs({ role: 'OFFICER', permissions: ['MANAGE_TRIPS'] });
    jest.mocked(getTrip).mockResolvedValue({ ...HEAVENLY_DETAIL, state: 'ACTIVE' });
    render(<TripManagementScreen />);
    expect(
      await screen.findByText(
        'This trip is active or over, so its configuration can no longer be edited.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit configuration' })).toBeNull();
  });

  it('refuses members without MANAGE_TRIPS', () => {
    signInAs();
    render(<TripManagementScreen />);
    expect(
      screen.getByText('Only officers who manage trips can open trip management.'),
    ).toBeTruthy();
    expect(getTrip).not.toHaveBeenCalled();
  });
});
