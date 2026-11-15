import type { TripDetail } from '@snowsync/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { deleteTrip } from './tripManagementApi';

/** What the officer must type, exactly, to enable deleting. */
export const DELETE_CONFIRMATION = 'DELETE';

export function DeleteTripControl({ trip }: { trip: TripDetail }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);

  if (trip.state !== 'CREATED') {
    return null;
  }

  const close = () => {
    setOpen(false);
    setTyped('');
    setError(undefined);
  };

  const confirm = async () => {
    setDeleting(true);
    setError(undefined);
    try {
      await deleteTrip(trip.id);
      close();
      router.replace('/trips');
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : "The trip wasn't deleted: we couldn't reach SnowSync. Try again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button label="Delete draft trip" variant="destructive" onPress={() => setOpen(true)} />
      <Dialog
        visible={open}
        title="Delete this unpublished trip?"
        message="Only a CREATED trip with no commitments may be deleted. Published or registered trips must be cancelled to preserve member history."
        primaryLabel="Delete draft trip"
        primaryVariant="destructive"
        primaryDisabled={typed !== DELETE_CONFIRMATION}
        primaryLoading={deleting}
        onPrimary={() => void confirm()}
        secondaryLabel="Keep draft"
        onSecondary={close}
        onDismiss={close}
      >
        <TextField
          label="Type DELETE to confirm"
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          testID="delete-confirmation"
        />
        {error ? <Text color="emergency">{error}</Text> : null}
      </Dialog>
    </>
  );
}
