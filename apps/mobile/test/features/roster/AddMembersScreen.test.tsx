import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AddMembersScreen } from '../../../src/features/roster/AddMembersScreen';
import { addRosterMember, getRoster } from '../../../src/features/roster/rosterApi';
import { searchMembers } from '../../../src/features/tripCreation/tripCreationApi';
import { PALISADES_ROSTER, PANKAJ } from './fixtures';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ tripId: 'trip-palisades' }),
}));
jest.mock('../../../src/features/roster/rosterApi', () => ({
  getRoster: jest.fn(),
  addRosterMember: jest.fn(),
}));
jest.mock('../../../src/features/tripCreation/tripCreationApi', () => ({
  searchMembers: jest.fn(),
}));

const AVA = {
  id: 'u-ava',
  displayName: 'Ava Chen',
  email: 'ava@csus.edu',
  role: 'MEMBER' as const,
};

async function renderLoaded() {
  jest.useFakeTimers();
  render(<AddMembersScreen />);
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
  jest.useRealTimers();
}

describe('AddMembersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getRoster).mockResolvedValue(PALISADES_ROSTER);
    jest
      .mocked(searchMembers)
      .mockResolvedValue([
        AVA,
        { id: PANKAJ.userId, displayName: PANKAJ.displayName, email: PANKAJ.email, role: 'MEMBER' },
      ]);
  });

  it('lists only approved members who are not on the roster yet', async () => {
    await renderLoaded();
    expect(await screen.findByText('AVAILABLE MEMBERS (1)')).toBeTruthy();
    expect(screen.getByText('Ava Chen')).toBeTruthy();
    expect(screen.queryByText('Pankaj Kaul')).toBeNull();
    expect(screen.getByText('Palisades Tahoe club day · 23 spots available')).toBeTruthy();
  });

  it('reviews and adds the selected member, then returns to the roster', async () => {
    jest.mocked(addRosterMember).mockResolvedValue({ ...PANKAJ, userId: 'u-ava' });
    await renderLoaded();
    fireEvent.press(await screen.findByRole('radio', { name: 'Ava Chen, ava@csus.edu' }));
    fireEvent.press(screen.getByRole('button', { name: 'Review 1 Selected Member' }));
    expect(screen.getByText('Add Ava to Palisades Tahoe?')).toBeTruthy();
    expect(screen.getByLabelText('Capacity after: 4 / 26')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add Ava' }));
    await waitFor(() =>
      expect(addRosterMember).toHaveBeenCalledWith('trip-palisades', 'u-ava', false),
    );
    expect(router.back).toHaveBeenCalled();
  });

  it('asks for an explicit over-capacity add when the trip is full', async () => {
    jest.mocked(getRoster).mockResolvedValue({
      ...PALISADES_ROSTER,
      summary: { ...PALISADES_ROSTER.summary, capacity: 3 },
    });
    jest.mocked(addRosterMember).mockResolvedValue({ ...PANKAJ, userId: 'u-ava' });
    await renderLoaded();
    fireEvent.press(await screen.findByRole('radio', { name: 'Ava Chen, ava@csus.edu' }));
    fireEvent.press(screen.getByRole('button', { name: 'Review 1 Selected Member' }));
    expect(screen.getByText(/adding goes over capacity/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add over capacity' }));
    await waitFor(() =>
      expect(addRosterMember).toHaveBeenCalledWith('trip-palisades', 'u-ava', true),
    );
  });

  it('leaves without adding from Cancel', async () => {
    await renderLoaded();
    fireEvent.press(await screen.findByRole('button', { name: 'Cancel' }));
    expect(router.back).toHaveBeenCalled();
    expect(addRosterMember).not.toHaveBeenCalled();
  });
});
