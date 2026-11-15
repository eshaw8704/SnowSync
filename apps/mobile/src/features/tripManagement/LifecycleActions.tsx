import type { TripDetail, TripState } from '@snowsync/shared';
import { useRef, useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { TRIP_STATE_LABELS } from '../../components/TripStateBadge';
import { formatDateTime } from '../trips/tripFormat';
import { newOpId } from './opId';
import { transitionTrip } from './tripManagementApi';

interface LifecycleAction {
  to: TripState;
  label: string;
  title: string;
  message: (trip: TripDetail) => string;
  confirm: string;
  done: string;
  needsReason: (trip: TripDetail) => boolean;
}

const ACTIONS: Partial<Record<TripState, LifecycleAction>> = {
  CREATED: {
    to: 'OPEN_FOR_REGISTRATION',
    label: 'Open registration now',
    title: 'Open registration now?',
    message: (trip) =>
      `${trip.name} changes from CREATED to Registration open. Approved members can reserve the ${trip.capacity} available spots. This overrides the scheduled ${formatDateTime(trip.registrationOpensAt, trip.resortTimeZone)} opening. It does not register you.`,
    confirm: 'Open registration',
    done: 'Registration is open.',
    needsReason: () => false,
  },
  OPEN_FOR_REGISTRATION: {
    to: 'CHECK_IN',
    label: 'Start check-in early',
    title: 'Start check-in early?',
    message: () =>
      'Registration open → Check-in. Registered members are told arrival verification can begin. Participants stay inactive until the active session starts.',
    confirm: 'Start check-in',
    done: 'Check-in has started.',
    needsReason: () => false,
  },
  CHECK_IN: {
    to: 'ACTIVE',
    label: 'Start active session early',
    title: 'Start active session now?',
    message: () =>
      'This starts the trip immediately, even before the scheduled start time. Use this only when the group has physically begun. Checked-in members can enter; late registered members can still check in.',
    confirm: 'Start active session',
    done: 'The active session has started.',
    needsReason: (trip) => Date.parse(trip.sessionStartsAt) > Date.now(),
  },
};

export interface LifecycleActionsProps {
  trip: TripDetail;
  onChanged: (message: string) => void;
}

export function LifecycleActions({ trip, onChanged }: LifecycleActionsProps) {
  const action = ACTIONS[trip.state];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const opId = useRef<string | null>(null);

  if (!action) {
    return null;
  }
  const reasonRequired = action.needsReason(trip);

  const close = () => {
    setOpen(false);
    setReason('');
    setError(undefined);
    opId.current = null;
  };

  const confirm = async () => {
    if (reasonRequired && reason.trim().length < 3) {
      setError('Explain why in a few words.');
      return;
    }
    opId.current ??= newOpId();
    setSending(true);
    setError(undefined);
    try {
      const result = await transitionTrip(trip.id, {
        fromState: trip.state,
        toState: action.to,
        opId: opId.current,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      close();
      onChanged(
        result.applied
          ? action.done
          : `This trip already moved to ${TRIP_STATE_LABELS[result.currentState]}.`,
      );
    } catch (caught) {
      if (
        caught instanceof ApiClientError &&
        caught.code !== 'NETWORK_ERROR' &&
        caught.code !== 'TIMEOUT'
      ) {
        setError(caught.message);
      } else {
        setError('Not applied: we couldn’t reach SnowSync. Try again; nothing happens twice.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button label={action.label} onPress={() => setOpen(true)} />
      <Dialog
        visible={open}
        title={action.title}
        message={action.message(trip)}
        primaryLabel={action.confirm}
        primaryLoading={sending}
        onPrimary={() => void confirm()}
        secondaryLabel="Cancel"
        onSecondary={close}
        onDismiss={close}
      >
        {action.to === 'ACTIVE' ? (
          <TextField
            label={reasonRequired ? 'Activation reason' : 'Activation reason (optional)'}
            value={reason}
            onChangeText={setReason}
            placeholder="Explain why the trip is starting early…"
            testID="activation-reason"
          />
        ) : null}
        {error ? <Text color="emergency">{error}</Text> : null}
      </Dialog>
    </>
  );
}
