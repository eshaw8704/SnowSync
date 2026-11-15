import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiClientError } from '../../../src/api/apiClient';
import { DeleteTripControl } from '../../../src/features/tripManagement/DeleteTripControl';
import { deleteTrip } from '../../../src/features/tripManagement/tripManagementApi';
import { HEAVENLY_DETAIL } from '../trips/fixtures';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../../../src/features/tripManagement/tripManagementApi', () => ({
  updateTrip: jest.fn(),
  deleteTrip: jest.fn(),
  transitionTrip: jest.fn(),
}));

const DRAFT = { ...HEAVENLY_DETAIL, state: 'CREATED' as const, registeredCount: 0 };

function confirmButton() {
  return screen.getAllByRole('button', { name: 'Delete draft trip' })[1]!;
}

describe('DeleteTripControl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing once the trip is published', () => {
    render(<DeleteTripControl trip={HEAVENLY_DETAIL} />);
    expect(screen.queryByRole('button', { name: 'Delete draft trip' })).toBeNull();
  });

  it('stays disabled until DELETE is typed exactly, then deletes and leaves', async () => {
    jest.mocked(deleteTrip).mockResolvedValue({ deleted: true });
    render(<DeleteTripControl trip={DRAFT} />);
    fireEvent.press(screen.getByRole('button', { name: 'Delete draft trip' }));
    expect(confirmButton()).toBeDisabled();
    fireEvent.changeText(screen.getByLabelText('Type DELETE to confirm'), 'delete');
    expect(confirmButton()).toBeDisabled();
    fireEvent.changeText(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    fireEvent.press(confirmButton());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/trips'));
    expect(deleteTrip).toHaveBeenCalledWith('trip-heavenly');
  });

  it("shows the server's reason when the delete is refused", async () => {
    jest.mocked(deleteTrip).mockRejectedValue(
      new ApiClientError(
        {
          code: 'CONFLICT',
          message: 'Cancel this trip instead.',
          details: { reason: 'DELETE_NOT_ALLOWED' },
        },
        409,
      ),
    );
    render(<DeleteTripControl trip={DRAFT} />);
    fireEvent.press(screen.getByRole('button', { name: 'Delete draft trip' }));
    fireEvent.changeText(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    fireEvent.press(confirmButton());
    expect(await screen.findByText('Cancel this trip instead.')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
