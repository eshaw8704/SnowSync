
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { RegistrationResultScreen } from '../../../src/features/registration/RegistrationResultScreen';
import { getMyRegistration } from '../../../src/features/registration/registrationApi';
import { getTrip } from '../../../src/features/trips/tripsApi';
import { HEAVENLY_DETAIL, MY_REGISTRATION } from '../trips/fixtures';

let mockOutcome: string | undefined;

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ tripId: 'trip-heavenly', outcome: mockOutcome }),
}));

jest.mock('../../../src/features/trips/tripsApi', () => ({
  getTrip: jest.fn(),
}));

jest.mock('../../../src/features/registration/registrationApi', () => ({
  getMyRegistration: jest.fn(),
}));

describe('RegistrationResultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOutcome = undefined;
    jest.mocked(getTrip).mockResolvedValue(HEAVENLY_DETAIL);
    jest.mocked(getMyRegistration).mockResolvedValue({
      ...MY_REGISTRATION,
      participation: 'REGISTERED',
    });
  });

  it('confirms the spot with payment and check-in next steps', async () => {
    mockOutcome = 'registered';
    render(<RegistrationResultScreen />);
    expect(await screen.findByRole('header', { name: 'See you at Heavenly.' })).toBeTruthy();
    expect(getMyRegistration).toHaveBeenCalledWith('trip-heavenly');
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
    expect(getMyRegistration).toHaveBeenCalledWith('trip-heavenly');
    expect(screen.getByText(/No duplicate reservation was created/)).toBeTruthy();
    expect(screen.getByLabelText('Date: Jan 30')).toBeTruthy();
    expect(screen.getByLabelText('Check-in: 7:30 AM')).toBeTruthy();
  });

  it('explains a full trip and sends the member to other trips', async () => {
    mockOutcome = 'full';
    jest.mocked(getTrip).mockResolvedValue({
      ...HEAVENLY_DETAIL,
      registeredCount: 24,
      capacity: 24,
    });
    render(<RegistrationResultScreen />);
    expect(await screen.findByRole('header', { name: 'This trip is full' })).toBeTruthy();
    expect(screen.getByText(/24 \/ 24 spots reserved/)).toBeTruthy();
    expect(screen.getByLabelText('Registered: 24')).toBeTruthy();
    expect(screen.getByLabelText('Remaining: 0')).toBeTruthy();
    expect(getMyRegistration).not.toHaveBeenCalled();
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
    expect(getMyRegistration).not.toHaveBeenCalled();
  });

  it('opens Trip detail when there is nothing to go back to', async () => {
    mockOutcome = 'registered';
    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    render(<RegistrationResultScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'View my trip' }));
    expect(router.replace).toHaveBeenCalledWith('/trip/trip-heavenly');
  });

  it('does not confirm registration for an invalid outcome', async () => {
    mockOutcome = 'invalid';
    render(<RegistrationResultScreen />);
    expect(
      await screen.findByRole('header', { name: 'Unable to confirm registration' }),
    ).toBeTruthy();
    expect(
      screen.queryByText('Your spot is confirmed. You are registered for this trip.'),
    ).toBeNull();
    expect(getMyRegistration).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'View trip' }));
    expect(router.replace).toHaveBeenCalledWith('/trip/trip-heavenly');
  });

  it('shows the actual registered count instead of capacity', async () => {
    mockOutcome = 'full';
    jest.mocked(getTrip).mockResolvedValue({
      ...HEAVENLY_DETAIL,
      registeredCount: 22,
      capacity: 24,
    });
    render(<RegistrationResultScreen />);
    expect(await screen.findByText(/22 \/ 24 spots reserved/)).toBeTruthy();
    expect(screen.getByLabelText('Registered: 22')).toBeTruthy();
    expect(screen.getByLabelText('Remaining: 2')).toBeTruthy();
  });

  it('does not confirm registration when the backend says NOT_REGISTERED', async () => {
    mockOutcome = 'registered';
    jest.mocked(getMyRegistration).mockResolvedValue({
      ...MY_REGISTRATION,
      participation: 'NOT_REGISTERED',
    });
    render(<RegistrationResultScreen />);
    expect(
      await screen.findByRole('header', { name: 'Unable to confirm registration' }),
    ).toBeTruthy();
    expect(screen.queryByText('Your spot is confirmed. You are registered for this trip.')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'View trip' }));
    expect(router.replace).toHaveBeenCalledWith('/trip/trip-heavenly');
  });

  it('allows retry when registration verification fails', async () => {
    mockOutcome = 'registered';
    jest.mocked(getMyRegistration)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ...MY_REGISTRATION,
        participation: 'REGISTERED',
      });
    render(<RegistrationResultScreen />);
    expect(
      await screen.findByRole('header', { name: 'Unable to confirm registration' }),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('header', { name: 'See you at Heavenly.' })).toBeTruthy();
    expect(getMyRegistration).toHaveBeenCalledTimes(2);
  });

  it('recognizes an already checked-in member as registered', async () => {
    mockOutcome = 'registered';
    jest.mocked(getMyRegistration).mockResolvedValue({
      ...MY_REGISTRATION,
      participation: 'CHECKED_IN',
    });
    render(<RegistrationResultScreen />);
    expect(await screen.findByRole('header', { name: 'See you at Heavenly.' })).toBeTruthy();
    expect(getMyRegistration).toHaveBeenCalledWith('trip-heavenly');
  });
});
