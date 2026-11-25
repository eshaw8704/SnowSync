import { OFFICER_REASON_MIN_LENGTH, type RosterEntry, type RosterResponse } from '@snowsync/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import { StatusHero } from '../../components/StatusHero';
import { StatusLayout } from '../../components/StatusLayout';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { TRIP_STATE_LABELS } from '../../components/TripStateBadge';
import { selectHasPermission, useAuthStore } from '../../state/authStore';
import { colors, radii, sizes, spacing } from '../../theme';
import { formatTripDate } from '../trips/tripFormat';
import { getRoster, removeRosterMember } from './rosterApi';
import { filterRoster, ROSTER_FILTERS, statusLine, type RosterFilter } from './rosterFormat';
import { RosterMemberRow } from './RosterMemberRow';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'failed'; reason: 'notFound' | 'network' | 'forbidden' | 'unknown' }
  | { kind: 'loaded'; roster: RosterResponse };

/** Trip states in which the roster can still change (matches the server). */
const EDITABLE = ['CREATED', 'OPEN_FOR_REGISTRATION', 'CHECK_IN', 'ACTIVE'];

/**
 * The officer Roster (SS-80, Figma catalog 22 pages 71–73): counts, filter chips, one row per
 * member with participation, check-in and payment kept separate, Add Member, and removing a
 * registered member with a required reason. Checked-in and active members are never removed here:
 * that is an attendance decision. Officers see attendance status, never member locations.
 */
export function RosterScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const canManage = useAuthStore(selectHasPermission('MANAGE_ROSTER'));
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [filter, setFilter] = useState<RosterFilter>('All');
  const [selected, setSelected] = useState<RosterEntry | null>(null);
  const [removing, setRemoving] = useState<RosterEntry | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [removeError, setRemoveError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const latest = useRef(0);

  const load = useCallback(() => {
    if (!canManage) return;
    const requestId = ++latest.current;
    getRoster(tripId).then(
      (roster) => {
        if (requestId === latest.current) setState({ kind: 'loaded', roster });
      },
      (error: unknown) => {
        if (requestId !== latest.current) return;
        const code = error instanceof ApiClientError ? error.code : null;
        setState({
          kind: 'failed',
          reason:
            code === 'NOT_FOUND'
              ? 'notFound'
              : code === 'FORBIDDEN'
                ? 'forbidden'
                : code === 'NETWORK_ERROR' || code === 'TIMEOUT'
                  ? 'network'
                  : 'unknown',
        });
      },
    );
  }, [tripId, canManage]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!canManage) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState variant="forbidden" onAction={() => router.replace('/trips')} />
      </Screen>
    );
  }
  if (state.kind === 'loading') {
    return (
      <Screen edges={['bottom']}>
        <LoadingSkeleton lines={5} accessibilityLabel="Loading roster" />
      </Screen>
    );
  }
  if (state.kind === 'failed') {
    return (
      <Screen edges={['bottom']}>
        {state.reason === 'notFound' || state.reason === 'forbidden' ? (
          <ErrorState variant={state.reason} onAction={() => router.replace('/trips')} />
        ) : (
          <ErrorState
            variant={state.reason}
            actionLabel="Try again"
            onAction={() => {
              setState({ kind: 'loading' });
              load();
            }}
          />
        )}
      </Screen>
    );
  }

  const { roster } = state;
  const { trip, summary } = roster;
  const tz = trip.resortTimeZone;
  const editable = EDITABLE.includes(trip.state);
  const shown = filterRoster(roster.entries, filter);
  const openAdd = () => router.push(`/trip/roster-add/${trip.id}`);

  const closeRemove = () => {
    setRemoving(null);
    setReason('');
    setRemoveError(undefined);
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setSaving(true);
    setRemoveError(undefined);
    try {
      await removeRosterMember(trip.id, removing.userId, reason.trim());
      setNotice(`${removing.displayName} was removed from this trip.`);
      closeRemove();
      load();
    } catch (error) {
      const why = error instanceof ApiClientError ? error.details?.reason : undefined;
      setRemoveError(
        why === 'USE_ATTENDANCE_ACTIONS'
          ? 'This member has checked in. Use attendance actions instead.'
          : "The member wasn't removed. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onSite = selected?.participation === 'CHECKED_IN' || selected?.participation === 'ACTIVE';

  return (
    <StatusLayout
      footer={
        editable && roster.entries.length > 0 ? (
          <Button label="Add Member" onPress={openAdd} />
        ) : undefined
      }
    >
      <StatusHero
        chip={TRIP_STATE_LABELS[trip.state].toUpperCase()}
        tone="green"
        caption="Roster"
        title={trip.name}
        subtitle={`${formatTripDate(trip.startsAt, tz)} · Officer-managed · Trip-bound cohort`}
        stats={[
          { label: 'Capacity', value: String(summary.capacity) },
          { label: 'Registered', value: String(summary.registered) },
          { label: 'Checked in', value: String(summary.checkedIn + summary.active) },
          {
            label: 'Unpaid',
            value: String(summary.unpaid),
            tone: summary.unpaid > 0 ? 'red' : 'default',
          },
        ]}
      />
      {notice ? <Text color="brandGreen">{notice}</Text> : null}
      {roster.entries.length === 0 ? (
        <EmptyState
          title="No members yet"
          message="This trip has no registered members. Add approved club members to build the cohort."
          actionLabel="Add First Member"
          onAction={openAdd}
          icon="account-group-outline"
        />
      ) : (
        <>
          <View style={styles.chips} accessibilityRole="tablist">
            {ROSTER_FILTERS.map((name) => (
              <Pressable
                key={name}
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === name }}
                accessibilityLabel={`Show ${name}`}
                onPress={() => setFilter(name)}
                style={[styles.chip, filter === name && styles.chipSelected]}
              >
                <Text variant="label" color={filter === name ? 'textOnBrand' : 'textPrimary'}>
                  {name}
                </Text>
              </Pressable>
            ))}
          </View>
          <View>
            {shown.map((entry) => (
              <RosterMemberRow
                key={entry.userId}
                entry={entry}
                timeZone={tz}
                onPress={() => setSelected(entry)}
              />
            ))}
            {shown.length === 0 ? <Text color="textMuted">Nobody matches this filter.</Text> : null}
          </View>
        </>
      )}
      <Text variant="caption" color="textMuted">
        Officers see attendance status, not member GPS coordinates.
      </Text>

      <Dialog
        visible={selected !== null}
        title={selected?.displayName ?? ''}
        message={
          selected
            ? onSite
              ? `${statusLine(selected, tz)}. An active participant needs an attendance review (left early, check-out) rather than being removed, so their participation history is kept.`
              : statusLine(selected, tz)
            : undefined
        }
        primaryLabel={
          selected?.participation === 'REGISTERED' && editable ? 'Remove from trip' : 'Done'
        }
        primaryVariant={
          selected?.participation === 'REGISTERED' && editable ? 'destructive' : 'primary'
        }
        onPrimary={() => {
          if (selected?.participation === 'REGISTERED' && editable) {
            setRemoving(selected);
          }
          setSelected(null);
        }}
        secondaryLabel="Close"
        onSecondary={() => setSelected(null)}
        onDismiss={() => setSelected(null)}
      />
      <Dialog
        visible={removing !== null}
        title={`Remove ${removing?.displayName ?? ''} from this roster?`}
        message="Releases a registered spot. Does not affect club membership. Paid charge history is preserved; payment review is separate. A reason is required."
        primaryLabel="Remove from Trip"
        primaryVariant="destructive"
        primaryLoading={saving}
        primaryDisabled={reason.trim().length < OFFICER_REASON_MIN_LENGTH}
        onPrimary={() => void confirmRemove()}
        secondaryLabel="Keep Registered"
        onSecondary={closeRemove}
        onDismiss={closeRemove}
      >
        <TextField
          label="Reason (required)"
          value={reason}
          onChangeText={setReason}
          placeholder="Why is this member being removed?"
          error={removeError}
          maxLength={500}
        />
      </Dialog>
    </StatusLayout>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: sizes.minTouchTargetIos - 8,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
});
