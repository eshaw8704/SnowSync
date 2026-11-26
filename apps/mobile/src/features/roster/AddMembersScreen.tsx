import type { MemberSearchResult, RosterResponse } from '@snowsync/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { DetailCard } from '../../components/DetailCard';
import { Dialog } from '../../components/Dialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import { StatusHero } from '../../components/StatusHero';
import { StatusLayout } from '../../components/StatusLayout';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { colors, radii, sizes, spacing } from '../../theme';
import { searchMembers } from '../tripCreation/tripCreationApi';
import { addRosterMember, getRoster } from './rosterApi';

/** Leaves the picker without adding anyone. */
function leave(tripId: string): void {
  if (router.canGoBack()) router.back();
  else router.replace(`/trip/roster/${tripId}`);
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * Add Members (SS-80, Figma catalog 22 page 72): approved club members who are not on this roster
 * yet, a search field, and a confirmation that says what adding does. At capacity the officer must
 * choose "Add over capacity" explicitly. Cancel, Back and the dialog's Cancel all leave unchanged.
 */
export function AddMembersScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [chosen, setChosen] = useState<MemberSearchResult | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();
  const latestSearch = useRef(0);

  const loadRoster = useCallback(() => {
    getRoster(tripId).then(setRoster, () => setFailed(true));
  }, [tripId]);
  useEffect(loadRoster, [loadRoster]);

  useEffect(() => {
    const requestId = ++latestSearch.current;
    const timer = setTimeout(() => {
      searchMembers(query).then(
        (found) => {
          if (requestId === latestSearch.current) setResults(found);
        },
        () => undefined,
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (failed) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState
          variant="network"
          actionLabel="Try again"
          onAction={() => {
            setFailed(false);
            loadRoster();
          }}
        />
      </Screen>
    );
  }
  if (!roster) {
    return (
      <Screen edges={['bottom']}>
        <LoadingSkeleton lines={4} accessibilityLabel="Loading members" />
      </Screen>
    );
  }

  const { trip, summary } = roster;
  const onRoster = new Set(roster.entries.map((entry) => entry.userId));
  const available = results.filter((member) => !onRoster.has(member.id));
  const spotsLeft = Math.max(0, summary.capacity - summary.registered);
  const full = spotsLeft === 0;

  const confirm = async () => {
    if (!chosen) return;
    setSaving(true);
    setSaveError(undefined);
    try {
      await addRosterMember(trip.id, chosen.id, full);
      setReviewing(false);
      leave(trip.id);
    } catch (error) {
      const reason = error instanceof ApiClientError ? error.details?.reason : undefined;
      setSaveError(
        reason === 'TRIP_FULL'
          ? 'The trip just filled up. Go back and try again to add over capacity.'
          : "The member wasn't added. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <StatusLayout
      footer={
        <>
          <Button
            label={chosen ? 'Review 1 Selected Member' : 'Select a member'}
            disabled={!chosen}
            onPress={() => setReviewing(true)}
          />
          <Button label="Cancel" variant="secondary" onPress={() => leave(trip.id)} />
        </>
      }
    >
      <StatusHero
        chip="ADD MEMBERS"
        tone="green"
        caption="Roster"
        title={`${trip.name} · ${full ? 'Full' : `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} available`}`}
        subtitle="Only approved club members not yet on this roster appear below."
      />
      <TextField
        label="Search members"
        value={query}
        onChangeText={setQuery}
        placeholder="Search name or Sac State email…"
        autoCapitalize="none"
      />
      <Text variant="label" color="textMuted">
        AVAILABLE MEMBERS ({available.length})
      </Text>
      <View>
        {available.map((member) => {
          const selected = chosen?.id === member.id;
          return (
            <Pressable
              key={member.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${member.displayName}, ${member.email}`}
              onPress={() => setChosen(selected ? null : member)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.radio, selected && styles.radioOn]} />
              <View style={styles.optionText}>
                <Text variant="bodyStrong">{member.displayName}</Text>
                <Text variant="caption" color="textMuted">
                  {member.email}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {available.length === 0 ? (
        <Text color="textMuted">No other approved members available to add.</Text>
      ) : null}

      <Dialog
        visible={reviewing && chosen !== null}
        title={`Add ${chosen ? firstName(chosen.displayName) : ''} to ${trip.resortName}?`}
        message={`Creates REGISTERED participation for this trip only. Registered becomes ${summary.registered + 1} / ${summary.capacity}.${full ? ' This trip is full: adding goes over capacity.' : ''} Payment and check-in details appear on their trip.`}
        primaryLabel={
          full ? 'Add over capacity' : `Add ${chosen ? firstName(chosen.displayName) : ''}`
        }
        primaryLoading={saving}
        onPrimary={() => void confirm()}
        secondaryLabel="Cancel"
        onSecondary={() => setReviewing(false)}
        onDismiss={() => setReviewing(false)}
      >
        <DetailCard
          title="Summary"
          rows={[
            { label: 'Member', value: chosen?.displayName ?? '' },
            { label: 'Trip', value: trip.name },
            {
              label: 'Capacity after',
              value: `${summary.registered + 1} / ${summary.capacity}`,
              valueColor: full ? 'emergency' : 'textPrimary',
            },
          ]}
        />
        {saveError ? <Text color="emergency">{saveError}</Text> : null}
      </Dialog>
    </StatusLayout>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.minTouchTargetAndroid,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.field,
  },
  optionSelected: { backgroundColor: colors.brandGreenSoft },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioOn: { borderColor: colors.brandGreen, borderWidth: 6 },
  optionText: { flex: 1 },
});
