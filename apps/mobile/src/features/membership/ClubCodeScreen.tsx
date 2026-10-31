import { redeemClubCodeRequestSchema } from '@snowsync/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { loadMe } from '../auth/sessionManager';
import { fieldErrors } from '../forms/fieldErrors';
import { redeemClubCode } from './membershipApi';

//Figma catalog 04 · 1, Verification / Membership / Code.
export function ClubCodeScreen() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [networkFailed, setNetworkFailed] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const submit = async () => {
    const parsed = redeemClubCodeRequestSchema.safeParse({ code });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).code);
      return;
    }
    setError(undefined);
    setNetworkFailed(false);
    setVerifying(true);
    try {
      await redeemClubCode(parsed.data.code);
      // Membership is now APPROVED: reloading /me moves the gate to onboarding.
      await loadMe();
    } catch (caught) {
      if (
        caught instanceof ApiClientError &&
        (caught.code === 'CONFLICT' || caught.code === 'VALIDATION_FAILED')
      ) {
        setError(caught.message);
      } else {
        setNetworkFailed(true);
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Screen scroll>
      <BrandHeader
        eyebrow="VERIFICATION"
        title="Enter your club code"
        subtitle="Got a one-time code from a club officer? Enter it to verify your membership faster."
      />
      {networkFailed ? (
        <ErrorState variant="network" actionLabel="Try again" onAction={() => void submit()} />
      ) : null}
      <TextField
        label="Club code"
        value={code}
        onChangeText={(value) => setCode(value.toUpperCase())}
        error={error}
        autoCapitalize="characters"
        maxLength={8}
        helperText="8 letters and numbers, from a club officer."
      />
      <Card>
        <Text variant="label" color="textMuted">
          NOTE
        </Text>
        <Text>
          A code verifies membership only. It never grants officer access or registers you for a
          trip.
        </Text>
      </Card>
      <Button label="Verify code" onPress={() => void submit()} loading={verifying} />
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
