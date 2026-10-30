import { z } from 'zod';

/** (Figma catalog 04, Basic Profile). */
export const PREFERRED_ACTIVITIES = ['SKIING', 'SNOWBOARDING', 'BOTH'] as const;
export type PreferredActivity = (typeof PREFERRED_ACTIVITIES)[number];

/** GET / PUT /me/profile */
export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { message: 'Enter your full name.' })
    .max(80, { message: 'Use 80 characters or fewer.' }),
  preferredActivity: z.enum(PREFERRED_ACTIVITIES).nullable(),
});
export type Profile = z.infer<typeof profileSchema>;

/** GET / PUT /me/emergency-contact. Readable only by the member and authorized officers. */
export const emergencyContactSchema = z.object({
  name: z.string().trim().min(1, { message: "Enter your contact's name." }).max(80),
  relationship: z.string().trim().min(1, { message: 'Enter how you are related.' }).max(40),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]+$/, { message: 'Enter a valid phone number.' })
    .refine(
      (phone) => {
        const digitCount = phone.replace(/\D/g, '').length;
        return digitCount >= 7 && digitCount <= 20;
      },
      { message: 'Enter a phone number with 7 to 20 digits.' },
    ),
});
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;

/** GET / PUT /me/notification-preferences */
export const notificationPreferencesSchema = z.object({
  tripReminders: z.boolean(),
  clubAnnouncements: z.boolean(),
  fundraisers: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

/** Defaults for a new member (Figma catalog 04, Notification Preferences). */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  tripReminders: true,
  clubAnnouncements: true,
  fundraisers: false,
};
