import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiClientError } from '../../../src/api/apiClient';
import { EditTripScreen } from '../../../src/features/tripManagement/EditTripScreen';
import { updateTrip } from '../../../src/features/tripManagement/tripManagementApi';
import { getTrip } from '../../../src/features/trips/tripsApi';
import { resetAuthStore } from '../../../src/state/authStore';
import { signInAs } from '../../helpers/auth';
import { HEAVENLY_DETAIL } from '../trips/fixtures';

jest.mock('expo-router', () => {
  const navigation = { addListener: jest.fn(() => jest.fn()), dispatch: jest.fn() };
  return {
    router: { back: jest.fn() },
    useLocalSearchParams: () => ({ tripId: 'trip-heavenly' }),
    useNavigation: () => navigation,
  };
});
jest.mock('../../../src/features/trips/tripsApi', () => ({
  listTrips: jest.fn(),
  getTrip: jest.fn(),
}));
jest.mock('../../../src/features/tripManagement/tripManagementApi', () => ({
  updateTrip: jest.fn(),
  deleteTrip: jest.fn(),
  transitionTrip: jest.fn(),
}));

describe('EditTripScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
    signInAs({ role: 'OFFICER', permissions: ['MANAGE_TRIPS'] });
  });

  it('starts from the saved values and saves with the loaded version', async () => {
    jest.mocked(getTrip).mockResolvedValue(HEAVENLY_DETAIL);
    jest.mocked(updateTrip).mockResolvedValue({ trip: HEAVENLY_DETAIL, wasPublished: true });
    render(<EditTripScreen />);
    const name = await screen.findByLabelText('Trip name');
    expect(name.props.value).toBe('Heavenly club day');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(
      screen.getByText('Changes to a published trip may require a trip update notification.'),
    ).toBeTruthy();
    fireEvent.changeText(name, 'Heavenly powder day');
    fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(jest.mocked(updateTrip).mock.calls[0]).toEqual([
      'trip-heavenly',
      expect.objectContaining({ name: 'Heavenly powder day', version: 3, costCents: 5000 }),
    ]);
  });

  it('reloads and explains when someone else saved first', async () => {
    jest.mocked(getTrip).mockResolvedValue(HEAVENLY_DETAIL);
    jest.mocked(updateTrip).mockRejectedValue(
      new ApiClientError(
        {
          code: 'CONFLICT',
          message: 'This trip changed since you opened it.',
          details: { reason: 'STALE_VERSION' },
        },
        409,
      ),
    );
    render(<EditTripScreen />);
    fireEvent.changeText(await screen.findByLabelText('Trip name'), 'Heavenly powder day');
    fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Someone else changed this trip')).toBeTruthy();
    expect(getTrip).toHaveBeenCalledTimes(2);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('refuses to edit an active trip', async () => {
    jest.mocked(getTrip).mockResolvedValue({ ...HEAVENLY_DETAIL, state: 'ACTIVE' });
    render(<EditTripScreen />);
    expect(await screen.findByText('This trip can no longer be edited')).toBeTruthy();
  });
});
