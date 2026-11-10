import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { TripCreatedScreen } from '../../../src/features/tripCreation/TripCreatedScreen';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ tripId: 'trip-9', resortName: 'Sugar Bowl' }),
}));

describe('TripCreatedScreen', () => {
  it('confirms the CREATED trip and opens it', () => {
    render(<TripCreatedScreen />);
    expect(screen.getByText('Trip created.')).toBeTruthy();
    expect(screen.getByText('Sugar Bowl is saved in CREATED state.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'View trip' }));
    expect(router.replace).toHaveBeenCalledWith('/trip/trip-9');
  });
});
