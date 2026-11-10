import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiClientError } from '../../../src/api/apiClient';
import { reviewRows, ReviewStep } from '../../../src/features/tripCreation/steps/ReviewStep';
import { createTrip } from '../../../src/features/tripCreation/tripCreationApi';
import { useTripWizardStore } from '../../../src/features/tripCreation/tripWizardStore';
import { VALID_DRAFT } from './fixtures';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), back: jest.fn() } }));
jest.mock('../../../src/features/tripCreation/tripCreationApi', () => ({
  createTrip: jest.fn(),
  searchMembers: jest.fn(),
}));

const maya = {
  id: '11111111-1111-4111-8111-111111111111',
  displayName: 'Maya Lee',
  email: 'maya@csus.edu',
  role: 'OFFICER' as const,
};

describe('ReviewStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTripWizardStore.setState({
      draft: { ...VALID_DRAFT, roster: [maya] },
      step: 6,
      errors: {},
      creating: false,
    });
  });

  it('summarizes every step with an Edit link back to it', () => {
    const rows = reviewRows({ ...VALID_DRAFT, roster: [maya] });
    expect(rows.map((row) => row.step)).toEqual([1, 2, 3, 4, 5]);
    expect(rows[1]!.value).toBe('Sugar Bowl · base lodge · 500 m');
    expect(rows[2]!.value).toBe('$45 · 24 capacity');
    expect(rows[2]!.detail).toMatch(/^Opens .+ · Closes .+$/);
    expect(rows[4]!.value).toBe('1 registered member · no active participants');
    render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Edit Resort & boundary' }));
    expect(useTripWizardStore.getState().step).toBe(2);
  });

  it('opens Registration settings (step 3) from the Registration row', () => {
    render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Edit Registration' }));
    expect(useTripWizardStore.getState().step).toBe(3);
  });

  it('creates the trip, clears the wizard and opens the confirmation', async () => {
    jest.mocked(createTrip).mockResolvedValue({ id: 'trip-9', resortName: 'Sugar Bowl' } as never);
    render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/trip/created',
        params: { tripId: 'trip-9', resortName: 'Sugar Bowl' },
      }),
    );
    expect(jest.mocked(createTrip).mock.calls[0]![0]).toMatchObject({
      costCents: 4500,
      rosterUserIds: [maya.id],
    });
    expect(useTripWizardStore.getState().draft.name).toBe('');
  });

  it('sends the officer back to the first invalid step instead of posting', () => {
    useTripWizardStore.setState({ draft: { ...VALID_DRAFT, capacityText: '' } });
    render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    expect(useTripWizardStore.getState().step).toBe(3);
    expect(createTrip).not.toHaveBeenCalled();
  });

  it('shows the server message and keeps the details after a refusal or network failure', async () => {
    jest.mocked(createTrip).mockRejectedValueOnce(
      new ApiClientError(
        {
          code: 'VALIDATION_FAILED',
          message: 'Only approved club members can be added to the roster.',
        },
        400,
      ),
    );
    render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    expect(
      await screen.findByText('Only approved club members can be added to the roster.'),
    ).toBeTruthy();
    jest
      .mocked(createTrip)
      .mockRejectedValueOnce(new ApiClientError({ code: 'NETWORK_ERROR', message: 'offline' }));
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    expect(await screen.findByText("Your trip wasn't created")).toBeTruthy();
    expect(useTripWizardStore.getState().draft.name).toBe('Sugar Bowl club day');
  });

  it('shows the server message for other server errors instead of a network failure', async () => {
    jest
      .mocked(createTrip)
      .mockRejectedValueOnce(
        new ApiClientError({ code: 'INTERNAL', message: 'Something went wrong on our side.' }, 500),
      );
    render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    expect(await screen.findByText('Something went wrong on our side.')).toBeTruthy();
    expect(screen.queryByText("Your trip wasn't created")).toBeNull();
  });

  it('after a timeout, warns the trip may be saved and points to Trips instead of retrying', async () => {
    jest
      .mocked(createTrip)
      .mockRejectedValueOnce(new ApiClientError({ code: 'TIMEOUT', message: 'timed out' }));
    render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    expect(await screen.findByText("We couldn't confirm your trip")).toBeTruthy();
    expect(screen.queryByText("Your trip wasn't created")).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Check Trips' }));
    expect(router.replace).toHaveBeenCalledWith('/trips');
    expect(createTrip).toHaveBeenCalledTimes(1);
    expect(useTripWizardStore.getState().draft.name).toBe('Sugar Bowl club day');
  });

  it('shows the description, and both dates when the trip ends on a later day', () => {
    const [sameDay] = reviewRows(VALID_DRAFT);
    expect(sameDay!.detail).toBe('A full day on snow with the Sac State crew.');
    expect(sameDay!.value).toMatch(/^[^–]+ · .+–.+$/);
    const [overnight] = reviewRows({
      ...VALID_DRAFT,
      description: '   ',
      endsAt: '2027-02-08T00:00:00.000Z',
    });
    expect(overnight!.detail).toBeUndefined();
    expect(overnight!.value.split(' – ')).toHaveLength(2);
    expect(overnight!.value).not.toContain(' · ');
  });

  it('explains a draft the schema rejects instead of calling it a network failure', async () => {
    const roster = Array.from({ length: 201 }, (_, index) => ({
      ...maya,
      id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
    }));
    useTripWizardStore.setState({ draft: { ...VALID_DRAFT, roster } });
    render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    expect(createTrip).not.toHaveBeenCalled();
    expect(screen.queryByText("Your trip wasn't created")).toBeNull();
    expect(await screen.findByText(/200/)).toBeTruthy();
  });

  it('locks the Edit links and ignores a second Create while the trip is being created', async () => {
    let finish: (value: never) => void = () => undefined;
    jest.mocked(createTrip).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    await waitFor(() => expect(createTrip).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByRole('button', { name: 'Edit Resort & boundary' }));
    fireEvent.press(screen.getByRole('button', { name: 'Edit details' }));
    expect(useTripWizardStore.getState().step).toBe(6);
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    expect(createTrip).toHaveBeenCalledTimes(1);
    finish({ id: 'trip-9', resortName: 'Sugar Bowl' } as never);
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
  });

  it('clears the draft but stays put when the trip finishes saving after the officer left', async () => {
    let finish: (value: never) => void = () => undefined;
    jest.mocked(createTrip).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { unmount } = render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    await waitFor(() => expect(createTrip).toHaveBeenCalledTimes(1));
    unmount();
    finish({ id: 'trip-9', resortName: 'Sugar Bowl' } as never);
    await waitFor(() => expect(useTripWizardStore.getState().draft.name).toBe(''));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('clears the shared creating flag even when the create fails after the officer left', async () => {
    let fail: (error: unknown) => void = () => undefined;
    jest.mocked(createTrip).mockReturnValue(new Promise((_, reject) => (fail = reject)));
    const { unmount } = render(<ReviewStep />);
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    await waitFor(() => expect(useTripWizardStore.getState().creating).toBe(true));
    unmount();
    fail(new ApiClientError({ code: 'NETWORK_ERROR', message: 'offline' }));
    await waitFor(() => expect(useTripWizardStore.getState().creating).toBe(false));
  });
});
