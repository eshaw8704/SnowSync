import { fireEvent, render, screen } from '@testing-library/react-native';
import { TripWizardScreen } from '../../../src/features/tripCreation/TripWizardScreen';
import { useTripWizardStore } from '../../../src/features/tripCreation/tripWizardStore';
import { resetAuthStore } from '../../../src/state/authStore';
import { signInAs } from '../../helpers/auth';
import { VALID_DRAFT } from './fixtures';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));
jest.mock('../../../src/features/tripCreation/tripCreationApi', () => ({
  searchMembers: jest.fn(() => Promise.resolve([])),
  createTrip: jest.fn(),
}));

describe('TripWizardScreen', () => {
  beforeEach(() => {
    resetAuthStore();
    useTripWizardStore.getState().reset();
  });

  it('is forbidden without MANAGE_TRIPS', () => {
    signInAs({ role: 'OFFICER' });
    render(<TripWizardScreen />);
    expect(screen.getByText('Only officers who manage trips can create one.')).toBeTruthy();
  });

  it('shows "Step 1 of 6" and keeps the officer on a step with errors', () => {
    signInAs({ role: 'OFFICER', permissions: ['MANAGE_TRIPS'] });
    render(<TripWizardScreen />);
    expect(screen.getByText('Step 1 of 6 · Basics')).toBeTruthy();
    expect(screen.getByText('Plan a mountain day')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue to resort' }));
    expect(screen.getByText('Use at least 3 characters.')).toBeTruthy();
    expect(screen.getByText('Step 1 of 6 · Basics')).toBeTruthy();
  });

  it('walks forward and back through the steps', () => {
    signInAs({ role: 'OFFICER', permissions: ['MANAGE_TRIPS'] });
    useTripWizardStore.setState({ draft: VALID_DRAFT });
    render(<TripWizardScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Continue to resort' }));
    expect(screen.getByText('Set the meeting area')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Confirm resort & geofence' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue to schedule' }));
    expect(screen.getByText('Set the trip timeline')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Who can join?')).toBeTruthy();
  });

  it('shows the review step last', () => {
    signInAs({ role: 'OFFICER', permissions: ['MANAGE_TRIPS'] });
    useTripWizardStore.setState({ draft: VALID_DRAFT, step: 6 });
    render(<TripWizardScreen />);
    expect(screen.getByText('Ready for review.')).toBeTruthy();
    expect(screen.getByText(/Step 6 of 6/)).toBeTruthy();
  });
});
