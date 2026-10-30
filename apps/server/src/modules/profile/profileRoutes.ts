import {
  emergencyContactSchema,
  notificationPreferencesSchema,
  profileSchema,
  type ApiSuccess,
  type EmergencyContact,
  type NotificationPreferences,
  type Profile,
} from '@snowsync/shared';
import { Router } from 'express';
import { requireApprovedMember, requireAuth } from '../../middleware/requireAuth';
import {
  completeOnboarding,
  getEmergencyContact,
  getNotificationPreferences,
  getProfile,
  saveEmergencyContact,
  saveNotificationPreferences,
  updateProfile,
} from './profileService';

/** The signed-in member's own profile data. Approved members only. Mounted at /me. */
export const profileRouter: Router = Router();

profileRouter.use(requireAuth, requireApprovedMember);

profileRouter.get('/profile', async (req, res) => {
  const body: ApiSuccess<Profile> = { ok: true, data: await getProfile(req.auth!.userId) };
  res.json(body);
});

profileRouter.put('/profile', async (req, res) => {
  const profile = profileSchema.parse(req.body);
  const body: ApiSuccess<Profile> = {
    ok: true,
    data: await updateProfile(req.auth!.userId, profile),
  };
  res.json(body);
});

profileRouter.get('/emergency-contact', async (req, res) => {
  const body: ApiSuccess<EmergencyContact | null> = {
    ok: true,
    data: await getEmergencyContact(req.auth!.userId),
  };
  res.json(body);
});

profileRouter.put('/emergency-contact', async (req, res) => {
  const contact = emergencyContactSchema.parse(req.body);
  const body: ApiSuccess<EmergencyContact> = {
    ok: true,
    data: await saveEmergencyContact(req.auth!.userId, contact),
  };
  res.json(body);
});

profileRouter.get('/notification-preferences', async (req, res) => {
  const body: ApiSuccess<NotificationPreferences> = {
    ok: true,
    data: await getNotificationPreferences(req.auth!.userId),
  };
  res.json(body);
});

profileRouter.put('/notification-preferences', async (req, res) => {
  const preferences = notificationPreferencesSchema.parse(req.body);
  const body: ApiSuccess<NotificationPreferences> = {
    ok: true,
    data: await saveNotificationPreferences(req.auth!.userId, preferences),
  };
  res.json(body);
});

profileRouter.post('/onboarding/complete', async (req, res) => {
  const body: ApiSuccess<{ onboardingCompleted: true }> = {
    ok: true,
    data: await completeOnboarding(req.auth!.userId),
  };
  res.json(body);
});
