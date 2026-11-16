import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { LifecycleActions } from '../../../src/features/tripManagement/LifecycleActions';
import { transitionTrip } from '../../../src/features/tripManagement/tripManagementApi';
import { HEAVENLY_DETAIL } from '../trips/fixtures';

jest.mock('../../../src/features/tripManagement/tripManagementApi', () => ({
  updateTrip: jest.fn(),
  deleteTrip: jest.fn(),
  transitionTrip: jest.fn(),
}));

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('LifecycleActions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens registration with a fresh opId and reports success', async () => {
    jest
      .mocked(transitionTrip)
      .mockResolvedValue({ applied: true, currentState: 'OPEN_FOR_REGISTRATION', version: 4 });
    const onChanged = jest.fn();
    render(
      <LifecycleActions trip={{ ...HEAVENLY_DETAIL, state: 'CREATED' }} onChanged={onChanged} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Open registration now' }));
    expect(screen.getByText('Open registration now?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open registration' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith('Registration is open.'));
    const request = jest.mocked(transitionTrip).mock.calls[0]![1];
    expect(request).toMatchObject({ fromState: 'CREATED', toState: 'OPEN_FOR_REGISTRATION' });
    expect(request.opId).toMatch(UUID_V4);
  });

  it('says so when the trip already moved', async () => {
    jest
      .mocked(transitionTrip)
      .mockResolvedValue({ applied: false, currentState: 'CHECK_IN', version: 5 });
    const onChanged = jest.fn();
    render(<LifecycleActions trip={HEAVENLY_DETAIL} onChanged={onChanged} />);
    fireEvent.press(screen.getByRole('button', { name: 'Start check-in early' }));
    fireEvent.press(screen.getByRole('button', { name: 'Start check-in' }));
    await waitFor(() =>
      expect(onChanged).toHaveBeenCalledWith('This trip already moved to Check-in.'),
    );
  });

  it('requires a reason before the scheduled start and reuses the opId on retry', async () => {
    jest
      .mocked(transitionTrip)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ applied: true, currentState: 'ACTIVE', version: 6 });
    const onChanged = jest.fn();
    render(
      <LifecycleActions trip={{ ...HEAVENLY_DETAIL, state: 'CHECK_IN' }} onChanged={onChanged} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Start active session early' }));
    fireEvent.press(screen.getByRole('button', { name: 'Start active session' }));
    expect(screen.getByText('Explain why in a few words.')).toBeTruthy();
    expect(transitionTrip).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Activation reason'), 'Group is on the lift');
    fireEvent.press(screen.getByRole('button', { name: 'Start active session' }));
    expect(await screen.findByText(/we couldn.t reach SnowSync/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Start active session' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith('The active session has started.'));
    const [first, second] = jest.mocked(transitionTrip).mock.calls.map((call) => call[1]);
    expect(second!.opId).toBe(first!.opId);
    expect(second!.reason).toBe('Group is on the lift');
  });

  it('offers nothing once the trip is active', () => {
    render(
      <LifecycleActions trip={{ ...HEAVENLY_DETAIL, state: 'ACTIVE' }} onChanged={jest.fn()} />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
