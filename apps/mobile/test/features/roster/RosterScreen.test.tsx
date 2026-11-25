import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiClientError } from '../../../src/api/apiClient';
import { getRoster, removeRosterMember } from '../../../src/features/roster/rosterApi';
import { RosterScreen } from '../../../src/features/roster/RosterScreen';
import { resetAuthStore } from '../../../src/state/authStore';
import { signInAs } from '../../helpers/auth';
import { PALISADES_ROSTER, PANKAJ, RILEY } from './fixtures';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: () => ({ tripId: 'trip-palisades' }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('../../../src/features/roster/rosterApi', () => ({
  getRoster: jest.fn(),
  removeRosterMember: jest.fn(),
}));

function asOfficer() {
  signInAs({ role: 'OFFICER', permissions: ['MANAGE_ROSTER'] });
}

describe('RosterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
    jest.mocked(getRoster).mockResolvedValue(PALISADES_ROSTER);
  });

  it('shows the counts, the members and the privacy note', async () => {
    asOfficer();
    render(<RosterScreen />);
    expect(await screen.findByRole('header', { name: 'Palisades Tahoe club day' })).toBeTruthy();
    expect(screen.getByLabelText('Capacity: 26')).toBeTruthy();
    expect(screen.getByLabelText('Registered: 3')).toBeTruthy();
    expect(screen.getByLabelText('Checked in: 2')).toBeTruthy();
    expect(screen.getByLabelText('Unpaid: 1')).toBeTruthy();
    expect(screen.getByText('Pankaj Kaul')).toBeTruthy();
    expect(screen.getByText('CHECKED IN · late 9:18 AM · paid $45')).toBeTruthy();
    expect(
      screen.getByText('Officers see attendance status, not member GPS coordinates.'),
    ).toBeTruthy();
  });

  it('filters with the chips', async () => {
    asOfficer();
    render(<RosterScreen />);
    fireEvent.press(await screen.findByRole('tab', { name: 'Show Unpaid' }));
    expect(screen.getByText('Pankaj Kaul')).toBeTruthy();
    expect(screen.queryByText('Riley Patel')).toBeNull();
  });

  it('removes a registered member only with a reason, then reloads', async () => {
    asOfficer();
    jest
      .mocked(removeRosterMember)
      .mockResolvedValue({ ...PANKAJ, participation: 'NOT_REGISTERED' });
    render(<RosterScreen />);
    fireEvent.press(await screen.findByRole('button', { name: /^Pankaj Kaul/ }));
    fireEvent.press(screen.getByRole('button', { name: 'Remove from trip' }));
    expect(screen.getByText('Remove Pankaj Kaul from this roster?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove from Trip' })).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Reason (required)'), 'Asked to be removed');
    fireEvent.press(screen.getByRole('button', { name: 'Remove from Trip' }));
    await waitFor(() =>
      expect(removeRosterMember).toHaveBeenCalledWith(
        'trip-palisades',
        'u-pankaj',
        'Asked to be removed',
      ),
    );
    expect(await screen.findByText('Pankaj Kaul was removed from this trip.')).toBeTruthy();
    expect(getRoster).toHaveBeenCalledTimes(2);
  });

  it('keeps the member with Keep Registered', async () => {
    asOfficer();
    render(<RosterScreen />);
    fireEvent.press(await screen.findByRole('button', { name: /^Pankaj Kaul/ }));
    fireEvent.press(screen.getByRole('button', { name: 'Remove from trip' }));
    fireEvent.press(screen.getByRole('button', { name: 'Keep Registered' }));
    expect(screen.queryByText('Remove Pankaj Kaul from this roster?')).toBeNull();
    expect(removeRosterMember).not.toHaveBeenCalled();
  });

  it('never offers removal for a checked-in member', async () => {
    asOfficer();
    render(<RosterScreen />);
    fireEvent.press(await screen.findByRole('button', { name: /^Riley Patel/ }));
    expect(screen.getByText(/needs an attendance review/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove from trip' })).toBeNull();
    expect(RILEY.participation).toBe('CHECKED_IN');
  });

  it('shows the empty roster with Add First Member', async () => {
    asOfficer();
    jest.mocked(getRoster).mockResolvedValue({ ...PALISADES_ROSTER, entries: [] });
    render(<RosterScreen />);
    const empty = await screen.findByText('No members yet');
    expect(empty).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add First Member' }));
    expect(router.push).toHaveBeenCalledWith('/trip/roster-add/trip-palisades');
  });

  it('opens Add Member from the footer', async () => {
    asOfficer();
    render(<RosterScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Add Member' }));
    expect(router.push).toHaveBeenCalledWith('/trip/roster-add/trip-palisades');
  });

  it('is officer-only', () => {
    signInAs();
    render(<RosterScreen />);
    expect(within(screen.root).getByText("You don't have permission")).toBeTruthy();
  });

  it('offers a retry when the roster cannot load', async () => {
    asOfficer();
    jest
      .mocked(getRoster)
      .mockRejectedValueOnce(new ApiClientError({ code: 'NETWORK_ERROR', message: 'offline' }));
    render(<RosterScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Pankaj Kaul')).toBeTruthy();
  });
});
