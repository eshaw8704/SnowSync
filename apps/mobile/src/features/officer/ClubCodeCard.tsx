import { isExecutiveRole, type ClubCodeResponse } from '@snowsync/shared';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Dialog } from '../../components/Dialog';
import { Text } from '../../components/Text';
import { selectHasPermission, useAuthStore } from '../../state/authStore';
import { createClubCode } from './clubCodesApi';

/**
 * Lets officers with CREATE_CLUB_CODES generate a one-time code to share with new members.
 * The server stores only its hash. Renders nothing without the permission.
 */
export function ClubCodeCard() {
  const canCreate = useAuthStore(selectHasPermission('CREATE_CLUB_CODES'));
  const role = useAuthStore((state) => state.user?.role);
  const isOfficerOrExecutive = role === 'OFFICER' || (role ? isExecutiveRole(role) : false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ClubCodeResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  if (!canCreate || !isOfficerOrExecutive) {
    return null;
  }

  const generate = async () => {
    setFailed(false);
    setCreating(true);
    try {
      const result = await createClubCode();
      setCopied(false);
      setCopyFailed(false);
      setCreated(result);
    } catch {
      setFailed(true);
    } finally {
      setCreating(false);
    }
  };

  const copyCode = async () => {
    if (!created) return;

    try {
      const success = await Clipboard.setStringAsync(created.code);
      if (!success) {
        setCopyFailed(true);
        return;
      }
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <Card>
      <Text variant="bodyStrong">One-time club code</Text>
      <Text color="textMuted">
        Share a code with a new member to verify their membership instantly. Each code works once
        and expires automatically.
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
            ? `${created.code}\n\nWorks once, until ${new Date(created.expiresAt).toLocaleDateString()}. A code verifies membership only. It never grants officer access or registers anyone for a trip. This code is not shown again.`
            : undefined
        }
        primaryLabel="Done"
        onPrimary={() => setCreated(null)}
        secondaryLabel={copied ? 'Copied!' : 'Copy code'}
        onSecondary={() => void copyCode()}
        onDismiss={() => setCreated(null)}
      >
        {copyFailed ? <Text color="emergency">Could not copy the code. Try again.</Text> : null}
      </Dialog>
    </Card>
  );
}
