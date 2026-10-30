import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type EmergencyContact,
  type NotificationPreferences,
  type Profile,
} from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../lib/httpError';

/** Name and preferred activity shown to officers and trip participants. */
export async function getProfile(userId: string): Promise<Profile> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { displayName: true, preferredActivity: true },
  });
  return { displayName: user.displayName, preferredActivity: user.preferredActivity };
}

export async function updateProfile(userId: string, profile: Profile): Promise<Profile> {
  await prisma.user.update({ where: { id: userId }, data: profile });
  return getProfile(userId);
}

/** The member's emergency contact, or null if they have not added one. */
export async function getEmergencyContact(userId: string): Promise<EmergencyContact | null> {
  const contact = await prisma.emergencyContact.findUnique({ where: { userId } });
  return contact
    ? { name: contact.name, relationship: contact.relationship, phone: contact.phone }
    : null;
}

export async function saveEmergencyContact(
  userId: string,
  contact: EmergencyContact,
): Promise<EmergencyContact> {
  await prisma.emergencyContact.upsert({
    where: { userId },
    update: contact,
    create: { userId, ...contact },
  });
  return contact;
}

/** Saved choices, or the defaults (trip reminders on, announcements on, fundraisers off). */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const saved = await prisma.notificationPreferences.findUnique({ where: { userId } });
  if (!saved) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
  return {
    tripReminders: saved.tripReminders,
    clubAnnouncements: saved.clubAnnouncements,
    fundraisers: saved.fundraisers,
  };
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  await prisma.notificationPreferences.upsert({
    where: { userId },
    update: preferences,
    create: { userId, ...preferences },
  });
  return preferences;
}

/**
 * Marks onboarding complete so it never shows again. Requires an emergency contact, because the
 * club needs one before the member's first trip. Calling it twice is harmless.
 */
export async function completeOnboarding(userId: string): Promise<{ onboardingCompleted: true }> {
  const contact = await prisma.emergencyContact.findUnique({
    where: { userId },
    select: { userId: true },
  });
  if (!contact) {
    throw new HttpError('VALIDATION_FAILED', 'Add an emergency contact before finishing setup.', {
      reason: 'ONBOARDING_INCOMPLETE',
      missing: ['emergencyContact'],
    });
  }
  await prisma.user.updateMany({
    where: { id: userId, onboardingCompletedAt: null },
    data: { onboardingCompletedAt: new Date() },
  });
  return { onboardingCompleted: true };
}
