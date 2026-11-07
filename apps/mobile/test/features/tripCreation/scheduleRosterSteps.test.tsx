import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RosterStep } from '../../../src/features/tripCreation/steps/RosterStep';
import { ScheduleStep } from '../../../src/features/tripCreation/steps/ScheduleStep';
import { searchMembers } from '../../../src/features/tripCreation/tripCreationApi';
import { EMPTY_DRAFT } from '../../../src/features/tripCreation/tripDraft';
import { VALID_DRAFT } from './fixtures';

jest.mock('../../../src/features/tripCreation/tripCreationApi', () => ({
  searchMembers: jest.fn(),
  createTrip: jest.fn(),
}));

const maya = {
  id: '11111111-1111-4111-8111-111111111111',
  displayName: 'Maya Lee',
  email: 'maya@csus.edu',
  role: 'OFFICER' as const,
};

const jacob = {
  id: '22222222-2222-4222-8222-222222222222',
  displayName: 'Jacob Stevens',
  email: 'jacob@csus.edu',
  role: 'MEMBER' as const,
};

describe('wizard steps 4 and 5', () => {
  beforeEach(() => {
    jest.mocked(searchMembers).mockReset();
  });

  it('Schedule shows the registration opening and the step errors', () => {
    render(
      <ScheduleStep
        value={VALID_DRAFT}
        onChange={jest.fn()}
        errors={{ sessionStartsAt: 'The active session must start after check-in.' }}
      />,
    );

    expect(screen.getByText('Open registration')).toBeTruthy();
    expect(screen.getByText('The active session must start after check-in.')).toBeTruthy();
    expect(screen.getByLabelText(/^Begin ending, /)).toBeTruthy();
  });

  it('Roster searches approved members, adds and removes them', async () => {
    jest.mocked(searchMembers).mockResolvedValue([maya, jacob]);

    const onChange = jest.fn();

    const { rerender } = render(<RosterStep value={EMPTY_DRAFT} onChange={onChange} errors={{}} />);

    fireEvent.changeText(screen.getByLabelText('Add from club directory'), 'a');

    await waitFor(() => expect(searchMembers).toHaveBeenLastCalledWith('a'));

    fireEvent.press((await screen.findAllByRole('button', { name: 'Add' }))[0]!);

    expect(onChange).toHaveBeenCalledWith({ roster: [maya] });

    rerender(
      <RosterStep value={{ ...EMPTY_DRAFT, roster: [maya] }} onChange={onChange} errors={{}} />,
    );

    expect(screen.getByText('Officer · REGISTERED')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Add' })).toHaveLength(1);

    fireEvent.press(screen.getByRole('button', { name: 'Remove' }));

    expect(onChange).toHaveBeenLastCalledWith({ roster: [] });
  });

  it('Roster explains a failed search', async () => {
    jest.mocked(searchMembers).mockRejectedValue(new Error('offline'));

    render(<RosterStep value={EMPTY_DRAFT} onChange={jest.fn()} errors={{}} />);

    expect(
      await screen.findByText('Could not search members. Check your connection and try again.'),
    ).toBeTruthy();
  });

  it('clears previous results immediately when the search query changes', async () => {
    jest.mocked(searchMembers).mockResolvedValue([maya]);

    render(<RosterStep value={EMPTY_DRAFT} onChange={jest.fn()} errors={{}} />);

    fireEvent.changeText(screen.getByLabelText('Add from club directory'), 'Maya');

    expect(await screen.findByText('Maya Lee')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Add from club directory'), 'Jacob');

    expect(screen.queryByText('Maya Lee')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
  });

  it('ignores an older API response after a newer search has started', async () => {
    let resolveOldSearch!: (members: (typeof maya)[]) => void;

    const oldSearch = new Promise<(typeof maya)[]>((resolve) => {
      resolveOldSearch = resolve;
    });

    jest.mocked(searchMembers).mockImplementation((query) => {
      if (query === 'Maya') {
        return oldSearch;
      }

      if (query === 'Jacob') {
        return Promise.resolve([jacob]);
      }

      return Promise.resolve([]);
    });

    render(<RosterStep value={EMPTY_DRAFT} onChange={jest.fn()} errors={{}} />);

    fireEvent.changeText(screen.getByLabelText('Add from club directory'), 'Maya');

    await waitFor(() => expect(searchMembers).toHaveBeenCalledWith('Maya'));

    fireEvent.changeText(screen.getByLabelText('Add from club directory'), 'Jacob');

    expect(await screen.findByText('Jacob Stevens')).toBeTruthy();

    await act(async () => {
      resolveOldSearch([maya]);
    });

    expect(screen.getByText('Jacob Stevens')).toBeTruthy();
    expect(screen.queryByText('Maya Lee')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Add' })).toHaveLength(1);
  });

  it('does not allow a member from an outdated search to be added', async () => {
    jest.mocked(searchMembers).mockImplementation((query) => {
      if (query === 'Maya') {
        return Promise.resolve([maya]);
      }

      if (query === 'Jacob') {
        return Promise.resolve([jacob]);
      }

      return Promise.resolve([]);
    });

    const onChange = jest.fn();

    render(<RosterStep value={EMPTY_DRAFT} onChange={onChange} errors={{}} />);

    fireEvent.changeText(screen.getByLabelText('Add from club directory'), 'Maya');

    expect(await screen.findByText('Maya Lee')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Add from club directory'), 'Jacob');

    // The old member is no longer selectable.
    expect(screen.queryByText('Maya Lee')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();

    expect(await screen.findByText('Jacob Stevens')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ roster: [jacob] });
  });
});
