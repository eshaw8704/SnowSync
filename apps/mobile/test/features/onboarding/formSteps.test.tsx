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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

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
    jest.mocked(saveProfile).mockResolvedValue({
      displayName: 'Jacob Stevens',
      preferredActivity: 'SKIING',
    });

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

    // Wait until the initial GET request finishes.
    await screen.findByLabelText('Contact name');

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

  it('does not allow emergency contact edits or saves while loading', async () => {
    const request = deferred<Awaited<ReturnType<typeof fetchEmergencyContact>>>();

    jest.mocked(fetchEmergencyContact).mockReturnValue(request.promise);

    renderRouter(routes, { initialUrl: '/emergency-contact' });

    expect(screen.queryByLabelText('Contact name')).toBeNull();

    expect(
      screen.getByRole('button', { name: 'Save & continue' }).props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Save & continue' }));

    expect(saveEmergencyContact).not.toHaveBeenCalled();

    request.resolve({
      name: 'Taylor Stevens',
      relationship: 'Sibling',
      phone: '(916) 555-0142',
    });

    expect(await screen.findByLabelText('Contact name')).toBeTruthy();

    expect(screen.getByLabelText('Contact name').props.value).toBe('Taylor Stevens');

    expect(screen.getByLabelText('Relationship').props.value).toBe('Sibling');

    expect(screen.getByLabelText('Phone').props.value).toBe('(916) 555-0142');
  });

  it('prevents emergency contact saves after a failed load and allows retry', async () => {
    jest
      .mocked(fetchEmergencyContact)
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({
        name: 'Taylor Stevens',
        relationship: 'Sibling',
        phone: '(916) 555-0142',
      });

    renderRouter(routes, { initialUrl: '/emergency-contact' });

    expect(await screen.findByRole('button', { name: 'Retry loading' })).toBeTruthy();

    expect(screen.queryByLabelText('Contact name')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Save & continue' }));

    expect(saveEmergencyContact).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Retry loading' }));

    expect(await screen.findByLabelText('Contact name')).toBeTruthy();

    expect(screen.getByLabelText('Contact name').props.value).toBe('Taylor Stevens');

    expect(fetchEmergencyContact).toHaveBeenCalledTimes(2);
    expect(saveEmergencyContact).not.toHaveBeenCalled();
  });

  it('saves notification choices', async () => {
    jest.mocked(saveNotificationPreferences).mockImplementation((value) => Promise.resolve(value));

    renderRouter(routes, { initialUrl: '/notifications' });

    // Wait until existing preferences are loaded.
    await screen.findByLabelText('Fundraisers');

    fireEvent(screen.getByLabelText('Fundraisers'), 'valueChange', true);

    fireEvent.press(screen.getByRole('button', { name: 'Save preferences' }));

    expect(await screen.findByText('Location privacy step')).toBeTruthy();

    expect(saveNotificationPreferences).toHaveBeenCalledWith({
      tripReminders: true,
      clubAnnouncements: true,
      fundraisers: true,
    });
  });

  it('does not allow notification edits or saves while loading', async () => {
    const request = deferred<Awaited<ReturnType<typeof fetchNotificationPreferences>>>();

    jest.mocked(fetchNotificationPreferences).mockReturnValue(request.promise);

    renderRouter(routes, { initialUrl: '/notifications' });

    expect(screen.queryByLabelText('Fundraisers')).toBeNull();

    expect(
      screen.getByRole('button', { name: 'Save preferences' }).props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Save preferences' }));

    expect(saveNotificationPreferences).not.toHaveBeenCalled();

    request.resolve({
      tripReminders: false,
      clubAnnouncements: true,
      fundraisers: true,
    });

    expect(await screen.findByLabelText('Fundraisers')).toBeTruthy();

    expect(screen.getByLabelText('Fundraisers').props.value).toBe(true);

    expect(saveNotificationPreferences).not.toHaveBeenCalled();
  });

  it('prevents notification saves after a failed load and allows retry', async () => {
    jest
      .mocked(fetchNotificationPreferences)
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({
        tripReminders: false,
        clubAnnouncements: true,
        fundraisers: true,
      });

    renderRouter(routes, { initialUrl: '/notifications' });

    expect(await screen.findByRole('button', { name: 'Retry loading' })).toBeTruthy();

    expect(screen.queryByLabelText('Fundraisers')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Save preferences' }));

    expect(saveNotificationPreferences).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Retry loading' }));

    expect(await screen.findByLabelText('Fundraisers')).toBeTruthy();

    expect(fetchNotificationPreferences).toHaveBeenCalledTimes(2);
    expect(saveNotificationPreferences).not.toHaveBeenCalled();
  });
});
