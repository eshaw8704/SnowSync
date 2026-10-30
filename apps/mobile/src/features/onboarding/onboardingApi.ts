import type { EmergencyContact, NotificationPreferences, Profile } from '@snowsync/shared';
import { authRequest } from '../../api/authClient';

/** GET /me/profile */
export const fetchProfile = () => authRequest<Profile>('GET', '/me/profile');

/** PUT /me/profile */
export const saveProfile = (profile: Profile) =>
  authRequest<Profile>('PUT', '/me/profile', { body: profile });

/** GET /me/emergency-contact (null until saved) */
export const fetchEmergencyContact = () =>
  authRequest<EmergencyContact | null>('GET', '/me/emergency-contact');

/** PUT /me/emergency-contact */
export const saveEmergencyContact = (contact: EmergencyContact) =>
  authRequest<EmergencyContact>('PUT', '/me/emergency-contact', { body: contact });

/** GET /me/notification-preferences */
export const fetchNotificationPreferences = () =>
  authRequest<NotificationPreferences>('GET', '/me/notification-preferences');

/** PUT /me/notification-preferences */
export const saveNotificationPreferences = (preferences: NotificationPreferences) =>
  authRequest<NotificationPreferences>('PUT', '/me/notification-preferences', {
    body: preferences,
  });

/** POST /me/onboarding/complete */
export const completeOnboarding = () =>
  authRequest<{ onboardingCompleted: true }>('POST', '/me/onboarding/complete');
