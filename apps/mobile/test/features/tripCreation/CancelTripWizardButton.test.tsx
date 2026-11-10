import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiClientError } from '../../../src/api/apiClient';
import {
  CancelTripWizardButton,
  hasDraftChanges,
} from '../../../src/features/tripCreation/CancelTripWizardButton';
import { ReviewStep } from '../../../src/features/tripCreation/steps/ReviewStep';
import { createTrip } from '../../../src/features/tripCreation/tripCreationApi';
import { EMPTY_DRAFT } from '../../../src/features/tripCreation/tripDraft';
import { useTripWizardStore } from '../../../src/features/tripCreation/tripWizardStore';
import { VALID_DRAFT } from './fixtures';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('../../../src/features/tripCreation/tripCreationApi', () => ({
  createTrip: jest.fn(),
  searchMembers: jest.fn(),
}));

describe('CancelTripWizardButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTripWizardStore.getState().reset();
  });

  it('knows when the officer has entered anything', () => {
    expect(hasDraftChanges(EMPTY_DRAFT)).toBe(false);
    expect(hasDraftChanges({ ...EMPTY_DRAFT, name: 'S' })).toBe(true);
  });

  it('leaves straight away when nothing was entered', () => {
    render(<CancelTripWizardButton />);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel trip creation' }));
    expect(screen.queryByText('Discard this trip?')).toBeNull();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('asks first when there are details, and keeps them on "Keep editing"', () => {
    useTripWizardStore.setState({ draft: VALID_DRAFT, step: 4 });
    render(<CancelTripWizardButton />);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel trip creation' }));
    expect(screen.getByText('Discard this trip?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));
    expect(router.back).not.toHaveBeenCalled();
    expect(useTripWizardStore.getState().draft.name).toBe('Sugar Bowl club day');
    expect(useTripWizardStore.getState().step).toBe(4);
  });

  it('clears the wizard and leaves on "Discard trip"', () => {
    useTripWizardStore.setState({ draft: VALID_DRAFT, step: 4 });
    render(<CancelTripWizardButton />);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel trip creation' }));
    fireEvent.press(screen.getByRole('button', { name: 'Discard trip' }));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(useTripWizardStore.getState().draft).toEqual(EMPTY_DRAFT);
    expect(useTripWizardStore.getState().step).toBe(1);
  });

  it('goes to Trips when there is no history to go back to', () => {
    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    render(<CancelTripWizardButton />);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel trip creation' }));
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/trips');
  });

  it('does nothing while the trip is being created', () => {
    useTripWizardStore.setState({ draft: VALID_DRAFT, creating: true });
    render(<CancelTripWizardButton />);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel trip creation' }));
    expect(screen.queryByText('Discard this trip?')).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
    expect(useTripWizardStore.getState().draft.name).toBe('Sugar Bowl club day');
  });

  it('is locked during submission and works again after a failed create, with the details kept', async () => {
    let fail: (error: unknown) => void = () => undefined;
    jest.mocked(createTrip).mockReturnValue(new Promise((_, reject) => (fail = reject)));
    useTripWizardStore.setState({ draft: VALID_DRAFT, step: 6 });
    render(
      <>
        <CancelTripWizardButton />
        <ReviewStep />
      </>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancel trip creation' })).toBeDisabled(),
    );

    await act(async () => fail(new ApiClientError({ code: 'NETWORK_ERROR', message: 'offline' })));
    expect(await screen.findByText("Your trip wasn't created")).toBeTruthy();
    expect(useTripWizardStore.getState().creating).toBe(false);
    expect(useTripWizardStore.getState().draft.name).toBe('Sugar Bowl club day');
    expect(screen.getByRole('button', { name: 'Cancel trip creation' })).toBeEnabled();
    fireEvent.press(screen.getByRole('button', { name: 'Cancel trip creation' }));
    expect(screen.getByText('Discard this trip?')).toBeTruthy();
  });
});
