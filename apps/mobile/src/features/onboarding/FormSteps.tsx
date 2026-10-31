import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  emergencyContactSchema,
  profileSchema,
  type NotificationPreferences,
  type PreferredActivity,
} from '@snowsync/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { ToggleRow } from '../../components/ToggleRow';
import { useAuthStore } from '../../state/authStore';
import { colors, radii, sizes, spacing } from '../../theme';
import { fieldErrors } from '../forms/fieldErrors';
import {
  fetchEmergencyContact,
  fetchNotificationPreferences,
  saveEmergencyContact,
  saveNotificationPreferences,
  saveProfile,
} from './onboardingApi';
import { OnboardingStep } from './OnboardingStep';

const ACTIVITY_LABELS: Record<PreferredActivity, string> = {
  SKIING: 'Skiing',
  SNOWBOARDING: 'Snowboarding',
  BOTH: 'Both',
};

/** Step 2 (Figma: Onboarding / Basic Profile). */
export function ProfileStep() {
  const user = useAuthStore((state) => state.user);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [activity, setActivity] = useState<PreferredActivity | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsed = profileSchema.safeParse({ displayName, preferredActivity: activity });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFailed(false);
    setSaving(true);
    try {
      await saveProfile(parsed.data);
      router.push('/emergency-contact');
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      step={2}
      title="Your mountain profile"
      subtitle="Help officers recognize you on trip day."
      primaryLabel="Continue"
      onPrimary={() => void save()}
      primaryLoading={saving}
    >
      {failed ? (
        <ErrorState variant="network" actionLabel="Try again" onAction={() => void save()} />
      ) : null}
      <TextField
        label="Full name"
        value={displayName}
        onChangeText={setDisplayName}
        error={errors.displayName}
      />
      <Text variant="label">Preferred activity</Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {(Object.keys(ACTIVITY_LABELS) as PreferredActivity[]).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected: activity === key }}
            onPress={() => setActivity(key)}
            style={[styles.option, activity === key && styles.optionSelected]}
          >
            <Text variant="label" color={activity === key ? 'textOnBrand' : 'textPrimary'}>
              {ACTIVITY_LABELS[key]}
            </Text>
          </Pressable>
        ))}
      </View>
    </OnboardingStep>
  );
}

/** Step 3 (Figma: Onboarding / Emergency Contact). */
export function EmergencyContactStep() {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmergencyContact().then(
      (contact) => {
        if (contact) {
          setName(contact.name);
          setRelationship(contact.relationship);
          setPhone(contact.phone);
        }
      },
      () => undefined,
    );
  }, []);

  const save = async () => {
    const parsed = emergencyContactSchema.safeParse({ name, relationship, phone });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFailed(false);
    setSaving(true);
    try {
      await saveEmergencyContact(parsed.data);
      router.push('/notifications');
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      step={3}
      title="Someone we can call"
      subtitle="Only authorized officers use this for trip safety."
      primaryLabel="Save & continue"
      onPrimary={() => void save()}
      primaryLoading={saving}
    >
      {failed ? (
        <ErrorState variant="network" actionLabel="Try again" onAction={() => void save()} />
      ) : null}
      <TextField
        label="Contact name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
      />
      <TextField
        label="Relationship"
        value={relationship}
        onChangeText={setRelationship}
        error={errors.relationship}
      />
      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <Card>
        <Text variant="label" color="textMuted">
          IMPORTANT
        </Text>
        <Text>
          This contact is visible only to authorized club officers for safety. Keep it current.
          SnowSync is not a replacement for emergency services.
        </Text>
      </Card>
    </OnboardingStep>
  );
}

/** Step 4 (Figma: Onboarding / Notification Preferences). */
export function NotificationsStep() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  });
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotificationPreferences().then(setPreferences, () => undefined);
  }, []);

  const set = (key: keyof NotificationPreferences) => (value: boolean) =>
    setPreferences((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setFailed(false);
    setSaving(true);
    try {
      await saveNotificationPreferences(preferences);
      router.push('/location-privacy');
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      step={4}
      title="The updates you need"
      subtitle="You control optional updates. Trip-critical and safety notices always reach your Inbox."
      primaryLabel="Save preferences"
      onPrimary={() => void save()}
      primaryLoading={saving}
    >
      {failed ? (
        <ErrorState variant="network" actionLabel="Try again" onAction={() => void save()} />
      ) : null}
      <Card>
        <ToggleRow
          label="Trip & check-in reminders"
          description="Important trip-day coordination"
          value={preferences.tripReminders}
          onValueChange={set('tripReminders')}
        />
        <ToggleRow
          label="Club announcements"
          description="Meetings and club updates"
          value={preferences.clubAnnouncements}
          onValueChange={set('clubAnnouncements')}
        />
        <ToggleRow
          label="Fundraisers"
          description="Optional club messages"
          value={preferences.fundraisers}
          onValueChange={set('fundraisers')}
        />
      </Card>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    minHeight: sizes.minTouchTargetAndroid,
    borderRadius: radii.field,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  optionSelected: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
});
