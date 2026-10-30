import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { ApiClientError } from '../../../src/api/apiClient';
import { loadMe } from '../../../src/features/auth/sessionManager';
import {
  CompleteStep,
  LocationPrivacyStep,
  OfflineStep,
  WelcomeStep,
} from '../../../src/features/onboarding/InfoScreens';
import { completeOnboarding } from '../../../src/features/onboarding/onboardingApi';

jest.mock('../../../src/features/onboarding/onboardingApi', () => ({
  completeOnboarding: jest.fn(),
}));
jest.mock('../../../src/features/auth/sessionManager', () => ({ loadMe: jest.fn() }));
const mockedComplete = jest.mocked(completeOnboarding);

const routes = {
  index: WelcomeStep,
  profile: () => <Text>Profile step</Text>,
  'emergency-contact': () => <Text>Emergency contact step</Text>,
  'location-privacy': LocationPrivacyStep,
  offline: OfflineStep,
  complete: CompleteStep,
};

describe('onboarding info steps', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows progress and walks forward', async () => {
    renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByLabelText('Step 1 of 7')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    expect(await screen.findByText('Profile step')).toBeTruthy();
  });

  it('explains location privacy and offline data', async () => {
    renderRouter(routes, { initialUrl: '/location-privacy' });
    expect(
      screen.getByText('Eligible active participants and officers for your trip.'),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('No signal? Still clear.')).toBeTruthy();
  });

  it('completes onboarding and reloads the user', async () => {
    mockedComplete.mockResolvedValue({ onboardingCompleted: true });
    renderRouter(routes, { initialUrl: '/complete' });
    fireEvent.press(screen.getByRole('button', { name: 'Go to Home' }));
    await waitFor(() => expect(loadMe).toHaveBeenCalled());
  });

  it('sends the member back when the emergency contact is missing', async () => {
    mockedComplete.mockRejectedValue(
      new ApiClientError(
        { code: 'VALIDATION_FAILED', message: 'x', details: { reason: 'ONBOARDING_INCOMPLETE' } },
        400,
      ),
    );
    renderRouter(routes, { initialUrl: '/complete' });
    fireEvent.press(screen.getByRole('button', { name: 'Go to Home' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Add emergency contact' }));
    expect(await screen.findByText('Emergency contact step')).toBeTruthy();
  });
});
