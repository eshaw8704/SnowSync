import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { HomeScreen } from '../../../src/features/home/HomeScreen';
import { nextStepText } from '../../../src/features/home/nextStepText';
import { listTrips } from '../../../src/features/trips/tripsApi';
import { resetAuthStore } from '../../../src/state/authStore';
import { signInAs } from '../../helpers/auth';
import { HEAVENLY } from '../trips/fixtures';

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

const now = new Date('2027-01-23T16:00:00.000Z');

describe('nextStepText', () => {
  it('reads the phase and my participation together', () => {
    expect(nextStepText({ ...HEAVENLY, myParticipation: 'REGISTERED' }, now)).toBe(
      "You're registered · 7 days to go",
    );
    expect(
      nextStepText({ ...HEAVENLY, state: 'CHECK_IN', myParticipation: 'REGISTERED' }, now),
    ).toBe('Check-in open');
    expect(nextStepText({ ...HEAVENLY, state: 'ACTIVE', myParticipation: 'ACTIVE' }, now)).toBe(
      'Your crew is on snow',
    );
    expect(nextStepText({ ...HEAVENLY, state: 'ACTIVE', myParticipation: 'REGISTERED' }, now)).toBe(
      'Session started · check in at the resort',
    );
  });
});

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
  });

  it('lists several of my trips in different phases, each with its own badges', async () => {
    signInAs({ displayName: 'Elijah Shaw' });
    jest.mocked(listTrips).mockResolvedValue([
      {
        ...HEAVENLY,
        id: 'a',
        name: 'Palisades Tahoe club day',
        state: 'ACTIVE',
        myParticipation: 'ACTIVE',
      },
      {
        ...HEAVENLY,
        id: 'b',
        name: 'Northstar club day',
        state: 'CHECK_IN',
        myParticipation: 'REGISTERED',
      },
    ]);
    render(<HomeScreen />);
    expect(screen.getByText('Hey, Elijah')).toBeTruthy();
    expect(await screen.findByText('Your crew is on snow')).toBeTruthy();
    expect(screen.getByText('Check-in open')).toBeTruthy();
    expect(listTrips).toHaveBeenCalledWith('mine');
    expect(screen.getByLabelText('TRIP: Active')).toBeTruthy();
    expect(screen.getByLabelText('YOU: Registered')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Northstar club day. Check-in open' }));
    expect(router.push).toHaveBeenCalledWith('/trip/b');
  });

  it('shows "No upcoming trips" with a Browse trips action', async () => {
    signInAs();
    jest.mocked(listTrips).mockResolvedValue([]);
    render(<HomeScreen />);
    expect(await screen.findByText('No upcoming trips')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Browse trips' }));
    expect(router.push).toHaveBeenCalledWith('/trips');
  });
});
