import type { TripDetail } from '@snowsync/shared';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Dialog } from '../../components/Dialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { selectHasPermission, useAuthStore } from '../../state/authStore';
import { spacing } from '../../theme';
import { serverFieldErrors } from '../forms/fieldErrors';
import { BasicsStep } from '../tripCreation/steps/BasicsStep';
import { RegistrationStep } from '../tripCreation/steps/RegistrationStep';
import { ResortStep } from '../tripCreation/steps/ResortStep';
import { ScheduleStep } from '../tripCreation/steps/ScheduleStep';
import {
  draftToUpdateRequest,
  tripDetailToDraft,
  validateConfiguration,
  type TripDraft,
} from '../tripCreation/tripDraft';
import { getTrip } from '../trips/tripsApi';
import { updateTrip } from './tripManagementApi';
import { EDITABLE_STATES } from './TripManagementScreen';

type Loaded = { trip: TripDetail; draft: TripDraft; saved: TripDraft };

/**
 * Edit trip configuration. Reuses the wizard's step components with
 * this screen's own state, starts from the saved values, and sends the loaded version when saving.
 * If another officer saved first, it says "Someone else changed this trip" and reloads. Leaving
 * with unsaved changes asks "Discard your changes?".
 */
export function EditTripScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const navigation = useNavigation();
  const canManage = useAuthStore(selectHasPermission('MANAGE_TRIPS'));
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [discardAction, setDiscardAction] = useState<unknown>(null);
  const allowLeave = useRef(false);

  const load = useCallback(() => {
    getTrip(tripId).then(
      (trip) => {
        const draft = tripDetailToDraft(trip);
        setLoaded({ trip, draft, saved: draft });
        setFailed(false);
      },
      () => setFailed(true),
    );
  }, [tripId]);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  const dirty = loaded !== null && JSON.stringify(loaded.draft) !== JSON.stringify(loaded.saved);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!dirty || allowLeave.current) return;
        event.preventDefault();
        setDiscardAction(event.data.action);
      }),
    [navigation, dirty],
  );

  if (!canManage) {
    return (
      <Screen>
        <ErrorState
          variant="forbidden"
          message="Only officers who manage trips can edit a trip."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }
  if (failed) {
    return (
      <Screen>
        <ErrorState variant="network" actionLabel="Try again" onAction={load} />
      </Screen>
    );
  }
  if (!loaded) {
    return (
      <Screen>
        <LoadingSkeleton lines={5} accessibilityLabel="Loading trip configuration" />
      </Screen>
    );
  }

  const { trip, draft } = loaded;
  const editable = EDITABLE_STATES.includes(trip.state);
  const change = (patch: Partial<TripDraft>) => {
    setLoaded({ ...loaded, draft: { ...draft, ...patch } });
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  };

  const save = async () => {
    setMessage(undefined);
    const check = validateConfiguration(draft);
    if (check.firstInvalidStep !== null) {
      setErrors(check.errors);
      setMessage('Fix the highlighted fields, then save again.');
      return;
    }
    setSaving(true);
    try {
      await updateTrip(trip.id, draftToUpdateRequest(draft, trip.version));
      allowLeave.current = true;
      router.back();
    } catch (error) {
      if (error instanceof ApiClientError && error.details?.reason === 'STALE_VERSION') {
        setConflict(true);
        load();
      } else if (error instanceof ApiClientError && error.code === 'VALIDATION_FAILED') {
        setErrors(serverFieldErrors(error.details));
        setMessage(error.message);
      } else if (error instanceof ApiClientError && error.code === 'CONFLICT') {
        setMessage(error.message);
      } else {
        setMessage("Your changes weren't saved: we couldn't reach SnowSync. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!editable) {
    return (
      <Screen>
        <ErrorState
          variant="unknown"
          title="This trip can no longer be edited"
          message="The configuration is editable only until the trip goes ACTIVE."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom']}>
      <Text variant="title" accessibilityRole="header">
        Edit trip configuration
      </Text>
      <Card>
        <Text color="late">
          Scroll to edit all trip settings. Changes are allowed before the trip goes ACTIVE.
        </Text>
        {trip.state !== 'CREATED' ? (
          <Text color="late">
            Changes to a published trip may require a trip update notification.
          </Text>
        ) : null}
      </Card>
      {message ? <Text color="emergency">{message}</Text> : null}
      <View style={{ gap: spacing.lg }}>
        <BasicsStep value={draft} onChange={change} errors={errors} />
        <ResortStep value={draft} onChange={change} errors={errors} />
        <RegistrationStep value={draft} onChange={change} errors={errors} />
        <ScheduleStep value={draft} onChange={change} errors={errors} />
      </View>
      <Button label="Save changes" onPress={() => void save()} loading={saving} disabled={!dirty} />
      <Button label="Cancel editing" variant="secondary" onPress={() => router.back()} />

      <Dialog
        visible={conflict}
        title="Someone else changed this trip"
        message="Your changes were not saved. The latest configuration is loaded now, so you can make them again."
        primaryLabel="OK"
        onPrimary={() => setConflict(false)}
        onDismiss={() => setConflict(false)}
      />
      <Dialog
        visible={discardAction !== null}
        title="Discard your changes?"
        message={`Your edits to ${trip.name} have not been saved. Keep editing or discard them; the saved configuration stays unchanged.`}
        primaryLabel="Keep editing"
        onPrimary={() => setDiscardAction(null)}
        secondaryLabel="Discard changes"
        onSecondary={() => {
          const action = discardAction;
          allowLeave.current = true;
          setDiscardAction(null);
          navigation.dispatch(action as Parameters<typeof navigation.dispatch>[0]);
        }}
        onDismiss={() => setDiscardAction(null)}
      />
    </Screen>
  );
}
