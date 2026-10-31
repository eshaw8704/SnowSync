import type { ClubCodeResponse } from '@snowsync/shared';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Dialog } from '../../components/Dialog';
import { Text } from '../../components/Text';
import { selectHasPermission, useAuthStore } from '../../state/authStore';
import { createClubCode } from './clubCodesApi';

/**
 * Lets officers with CREATE_CLUB_CODES generate a one-time code to share in person. The code is
 * shown once: the server stores only its hash. Renders nothing without the permission.
 */
export function ClubCodeCard() {
  const canCreate = useAuthStore(selectHasPermission('CREATE_CLUB_CODES'));
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ClubCodeResponse | null>(null);
  const [failed, setFailed] = useState(false);

  if (!canCreate) {
    return null;
  }

  const generate = async () => {
    setFailed(false);
    setCreating(true);
    try {
      setCreated(await createClubCode());
    } catch {
      setFailed(true);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <Text variant="bodyStrong">One-time club code</Text>
      <Text color="textMuted">
        Share a code in person to verify a new member instantly. Each code works once, for 7 days.
      </Text>
      {failed ? (
        <Text color="emergency">Could not create a code. Check your connection and try again.</Text>
      ) : null}
      <Button
        label="Generate club code"
        variant="secondary"
        onPress={() => void generate()}
        loading={creating}
      />
      <Dialog
        visible={created !== null}
        title="Club code ready"
        message={
          created
            ? `${created.code}\n\nWorks once, until ${new Date(created.expiresAt).toLocaleDateString()}. It verifies membership only: never officer access or a trip spot. This code is not shown again.`
            : undefined
        }
        primaryLabel="Done"
        onPrimary={() => setCreated(null)}
        onDismiss={() => setCreated(null)}
      />
    </Card>
  );
}
