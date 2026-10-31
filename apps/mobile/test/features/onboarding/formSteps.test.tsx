import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';
import {
  EmergencyContactStep,
  NotificationsStep,
  ProfileStep,
} from '../../../src/features/onboarding/FormSteps';
import {
  fetchEmergencyContact,
  fetchNotificationPreferences,
  saveEmergencyContact,
  saveNotificationPreferences,
  saveProfile,
} from '../../../src/features/onboarding/onboardingApi';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

jest.mock('../../../src/features/onboarding/onboardingApi', () => ({
  saveProfile: jest.fn(),
  fetchEmergencyContact: jest.fn(),
  saveEmergencyContact: jest.fn(),
  fetchNotificationPreferences: jest.fn(),
  saveNotificationPreferences: jest.fn(),
}));

const routes = {
  profile: ProfileStep,
  'emergency-contact': EmergencyContactStep,
  notifications: NotificationsStep,
  'location-privacy': () => <Text>Location privacy step</Text>,
};

describe('onboarding form steps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
    useAuthStore.getState().userLoaded({
      id: 'u1',
      email: 'jacob@csus.edu',
      displayName: 'Jacob Stevens',
      role: 'MEMBER',
      membershipStatus: 'APPROVED',
      onboardingCompleted: false,
      permissions: [],
    });
    jest.mocked(fetchEmergencyContact).mockResolvedValue(null);
    jest.mocked(fetchNotificationPreferences).mockResolvedValue({
      tripReminders: true,
      clubAnnouncements: true,
      fundraisers: false,
    });
  });

  it('saves the profile with the chosen activity', async () => {
    jest
      .mocked(saveProfile)
      .mockResolvedValue({ displayName: 'Jacob Stevens', preferredActivity: 'SKIING' });

    renderRouter(routes, { initialUrl: '/profile' });
    expect(screen.getByLabelText('Full name').props.value).toBe('Jacob Stevens');
    fireEvent.press(screen.getByRole('radio', { name: 'Skiing' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Someone we can call')).toBeTruthy();
    expect(saveProfile).toHaveBeenCalledWith({
      displayName: 'Jacob Stevens',
      preferredActivity: 'SKIING',
    });
  });

  it('validates and saves the emergency contact', async () => {
    jest.mocked(saveEmergencyContact).mockImplementation((contact) => Promise.resolve(contact));

    renderRouter(routes, { initialUrl: '/emergency-contact' });
    fireEvent.press(screen.getByRole('button', { name: 'Save & continue' }));
    expect(await screen.findByText("Enter your contact's name.")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Contact name'), 'Taylor Stevens');
    fireEvent.changeText(screen.getByLabelText('Relationship'), 'Sibling');
    fireEvent.changeText(screen.getByLabelText('Phone'), '(916) 555-0142');
    fireEvent.press(screen.getByRole('button', { name: 'Save & continue' }));
    await waitFor(() =>
      expect(saveEmergencyContact).toHaveBeenCalledWith({
        name: 'Taylor Stevens',
        relationship: 'Sibling',
        phone: '(916) 555-0142',
      }),
    );
  });

  it('saves notification choices', async () => {
    jest.mocked(saveNotificationPreferences).mockImplementation((value) => Promise.resolve(value));

    renderRouter(routes, { initialUrl: '/notifications' });
    await waitFor(() => expect(fetchNotificationPreferences).toHaveBeenCalled());
    fireEvent(screen.getByLabelText('Fundraisers'), 'valueChange', true);
    fireEvent.press(screen.getByRole('button', { name: 'Save preferences' }));
    expect(await screen.findByText('Location privacy step')).toBeTruthy();
    expect(saveNotificationPreferences).toHaveBeenCalledWith({
      tripReminders: true,
      clubAnnouncements: true,
      fundraisers: true,
    });
  });
});
