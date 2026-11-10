import { MaterialCommunityIcons } from '@expo/vector-icons';
import { findResort, type CreateTripRequest } from '@snowsync/shared';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ZodError } from 'zod';
import { ApiClientError } from '../../../api/apiClient';
import { Card } from '../../../components/Card';
import { formatFieldValue } from '../../../components/DateTimeField';
import { ErrorState } from '../../../components/ErrorState';
import { Text } from '../../../components/Text';
import { TripStateBadge } from '../../../components/TripStateBadge';
import { colors, radii, sizes, spacing } from '../../../theme';
import { formatCost } from '../../trips/tripFormat';
import { createTrip } from '../tripCreationApi';
import {
  draftToCreateRequest,
  parseCapacity,
  parseCostCents,
  type TripDraft,
  type WizardStep,
} from '../tripDraft';
import { TripWizardStep } from '../TripWizardStep';
import { useTripWizardStore } from '../tripWizardStore';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const time = (iso: string | null) => (iso ? formatFieldValue(iso, 'time') : 'not set');

const dateTime = (iso: string | null) => (iso ? formatFieldValue(iso, 'datetime') : 'not set');

/** "Sat, Feb 6 · 8:00 AM–4:00 PM", or with both dates when the trip ends on a later day. */
function tripWhen(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) return 'Date not set';
  const startDate = formatFieldValue(startsAt, 'date');
  const endDate = endsAt ? formatFieldValue(endsAt, 'date') : startDate;
  return endDate === startDate
    ? `${startDate} · ${time(startsAt)}–${time(endsAt)}`
    : `${startDate} ${time(startsAt)} – ${endDate} ${time(endsAt)}`;
}

/** One summary row per wizard step (Figma catalog 09, step 6), each with the step its Edit link opens. */
export function reviewRows(
  draft: TripDraft,
): { step: WizardStep; icon: IconName; label: string; value: string; detail?: string }[] {
  const resort = draft.resortName ? findResort(draft.resortName) : undefined;
  const capacity = parseCapacity(draft.capacityText);
  const cost = parseCostCents(draft.costText);
  const members = draft.roster.length;
  return [
    {
      step: 1,
      icon: 'calendar-month-outline',
      label: draft.name || 'Untitled trip',
      value: tripWhen(draft.startsAt, draft.endsAt),
      detail: draft.description.trim() || undefined,
    },
    {
      step: 2,
      icon: 'map-marker-radius-outline',
      label: 'Resort & boundary',
      value: resort
        ? `${resort.name} · ${resort.baseLodgeLabel} · ${draft.radiusMeters} m`
        : 'Resort not chosen',
    },
    {
      step: 3,
      icon: 'ticket-outline',
      label: 'Registration',
      value: `${Number.isNaN(cost) ? '$?' : formatCost(cost)} · ${Number.isNaN(capacity) ? '?' : capacity} capacity`,
      detail: `Opens ${dateTime(draft.registrationOpensAt)} · Closes ${dateTime(draft.registrationClosesAt)}`,
    },
    {
      step: 4,
      icon: 'clock-outline',
      label: 'Lifecycle schedule',
      value: [
        `Check-in ${time(draft.checkInStartsAt)}`,
        `Active ${time(draft.sessionStartsAt)}`,
        `Ending ${time(draft.exitStartsAt)}`,
      ].join(' · '),
    },
    {
      step: 5,
      icon: 'account-group-outline',
      label: 'Initial roster',
      value:
        members === 0
          ? 'No roster members yet'
          : `${members} registered ${members === 1 ? 'member' : 'members'} · no active participants`,
    },
  ];
}

/**
 * Step 6 · Review and create (SS-132). Summarizes each step with an Edit link back to it. Create
 * re-validates everything, posts the trip, clears the wizard and opens the confirmation.
 */
export function ReviewStep() {
  const { draft, goTo, validateAll, reset, creating, setCreating } = useTripWizardStore();
  const [message, setMessage] = useState<string>();
  const [failure, setFailure] = useState<'network' | 'timeout'>();
  // A ref, not just state, so a second tap in the same frame can't send a second POST.
  const inFlight = useRef(false);
  // False once the officer has left the wizard (swipe back, Android back, Cancel).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const create = async () => {
    if (inFlight.current) return;
    setMessage(undefined);
    setFailure(undefined);
    if (!validateAll()) return;
    // Built before the request: a draft the shared schema still rejects (for example a roster over
    // the 200-member limit) is the officer's to fix, not a network failure.
    let request: CreateTripRequest;
    try {
      request = draftToCreateRequest(draft);
    } catch (error) {
      setMessage(
        (error instanceof ZodError ? error.issues[0]?.message : undefined) ??
          'Check the trip details and try again.',
      );
      return;
    }
    inFlight.current = true;
    setCreating(true);
    try {
      const trip = await createTrip(request);
      // The trip is saved either way, so the draft must go; but if the officer already left the
      // wizard, don't pull them back to the confirmation from wherever they went.
      reset();
      if (!mounted.current) return;
      router.replace({
        pathname: '/trip/created',
        params: { tripId: trip.id, resortName: trip.resortName },
      });
    } catch (error) {
      // POST /trips has no idempotency key: after a TIMEOUT the trip may already be saved, so
      // don't promise "nothing was saved" or invite a blind retry that could create a duplicate.
      if (error instanceof ApiClientError && error.code === 'TIMEOUT') {
        setFailure('timeout');
      } else if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') {
        setFailure('network');
      } else if (error instanceof ApiClientError) {
        setMessage(error.message);
      } else {
        setMessage('Something went wrong creating the trip. Your details are still here.');
      }
    } finally {
      // Always, even after the officer left: the flag is shared, and a stuck one would keep the
      // next wizard's Cancel disabled.
      inFlight.current = false;
      setCreating(false);
    }
  };

  return (
    <TripWizardStep
      step={6}
      title="Ready for review."
      primaryLabel="Create trip"
      onPrimary={() => void create()}
      primaryLoading={creating}
      secondaryLabel="Edit details"
      onSecondary={() => {
        if (!creating) goTo(1);
      }}
    >
      <TripStateBadge state="CREATED" showPrefix={false} />
      {failure === 'network' ? (
        <ErrorState
          variant="network"
          title="Your trip wasn't created"
          message="We couldn't reach SnowSync, so your trip probably wasn't saved. Your details are still here."
          actionLabel="Try again"
          onAction={() => void create()}
        />
      ) : null}
      {failure === 'timeout' ? (
        <ErrorState
          variant="unknown"
          title="We couldn't confirm your trip"
          message="SnowSync took too long to answer, so your trip may already be saved. Check the Created list on the Trips tab before trying again; your details are still here."
          actionLabel="Check Trips"
          onAction={() => router.replace('/trips')}
        />
      ) : null}
      {message ? <Text color="emergency">{message}</Text> : null}
      <Card padding={0}>
        {reviewRows(draft).map((row) => (
          <View key={row.step} style={styles.row}>
            <View style={styles.icon}>
              <MaterialCommunityIcons name={row.icon} size={20} color={colors.brandGreen} />
            </View>
            <View style={styles.text}>
              <Text variant="caption" color="textMuted">
                {row.label}
              </Text>
              <Text variant="bodyStrong">{row.value}</Text>
              {row.detail ? (
                <Text variant="caption" color="textMuted" numberOfLines={3}>
                  {row.detail}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${row.label}`}
              onPress={() => goTo(row.step)}
              disabled={creating}
              accessibilityState={{ disabled: creating }}
              style={styles.edit}
            >
              <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.brandGreen} />
            </Pressable>
          </View>
        ))}
      </Card>
      <Card>
        <Text variant="caption" color="textMuted">
          Nothing is public until registration opens. You can edit details after creation.
        </Text>
      </Card>
    </TripWizardStep>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.field,
    backgroundColor: colors.brandGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  edit: {
    minWidth: sizes.minTouchTargetIos,
    minHeight: sizes.minTouchTargetIos,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
