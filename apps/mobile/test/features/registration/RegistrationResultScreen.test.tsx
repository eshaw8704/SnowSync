import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { RegistrationResultScreen } from '../../../src/features/registration/RegistrationResultScreen';
import { getTrip } from '../../../src/features/trips/tripsApi';
import { HEAVENLY_DETAIL } from '../trips/fixtures';

let mockOutcome: string | undefined;
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ tripId: 'trip-heavenly', outcome: mockOutcome }),
}));
jest.mock('../../../src/features/trips/tripsApi', () => ({ getTrip: jest.fn() }));

describe('RegistrationResultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getTrip).mockResolvedValue(HEAVENLY_DETAIL);
  });

  it('confirms the spot with payment and check-in next steps', async () => {
    mockOutcome = 'registered';
    render(<RegistrationResultScreen />);
    expect(await screen.findByRole('header', { name: 'See you at Heavenly.' })).toBeTruthy();
    expect(screen.getByLabelText('Status: REGISTERED')).toBeTruthy();
    expect(screen.getByLabelText('Payment: Pay $50 if required')).toBeTruthy();
    expect(screen.getByLabelText('Check-in: 7:30 AM')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'View my trip' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('says no duplicate was created', async () => {
    mockOutcome = 'already';
    render(<RegistrationResultScreen />);
    expect(await screen.findByRole('header', { name: 'Your spot is saved.' })).toBeTruthy();
    expect(screen.getByText(/No duplicate reservation was created/)).toBeTruthy();
    expect(screen.getByLabelText('Date: Jan 30')).toBeTruthy();
    expect(screen.getByLabelText('Check-in: 7:30 AM')).toBeTruthy();
  });

  it('explains a full trip and sends the member to other trips', async () => {
    mockOutcome = 'full';
    render(<RegistrationResultScreen />);
    expect(await screen.findByRole('header', { name: 'This trip is full' })).toBeTruthy();
    expect(screen.getByText(/24 \/ 24 spots reserved/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Browse available trips' }));
    expect(router.replace).toHaveBeenCalledWith('/trips');
  });

  it('explains closed registration in amber with the deadline', async () => {
    mockOutcome = 'closed';
    render(<RegistrationResultScreen />);
    expect(await screen.findByRole('header', { name: 'Registration has closed' })).toBeTruthy();
    expect(screen.getByLabelText('Status: CLOSED')).toBeTruthy();
    expect(screen.getByLabelText('Ended: Jan 28, 6:00 PM')).toBeTruthy();
    expect(screen.getByLabelText('Late entry: Officer approval required')).toBeTruthy();
  });

  it('opens Trip detail when there is nothing to go back to', async () => {
    mockOutcome = 'registered';
    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    render(<RegistrationResultScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'View my trip' }));
    expect(router.replace).toHaveBeenCalledWith('/trip/trip-heavenly');
  });
});
