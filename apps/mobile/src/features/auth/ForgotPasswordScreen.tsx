import { forgotPasswordRequestSchema } from '@snowsync/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { TextLink } from '../../components/TextLink';
import { fieldErrors } from '../forms/fieldErrors';
import { requestPasswordReset } from './passwordResetApi';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [networkFailed, setNetworkFailed] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const parsed = forgotPasswordRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).email);
      return;
    }
    setError(undefined);
    setNetworkFailed(false);
    setSending(true);
    try {
      await requestPasswordReset(parsed.data.email);
      router.replace({ pathname: '/instructions-sent', params: { email: parsed.data.email } });
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.code === 'VALIDATION_FAILED') {
        setError(caught.message);
      } else {
        setNetworkFailed(true);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen scroll>
      <BrandHeader
        title="Forgot your password?"
        subtitle="Enter your email and we'll send reset instructions if an account exists."
      />
      {networkFailed ? (
        <ErrorState variant="network" actionLabel="Try again" onAction={() => void submit()} />
      ) : null}
      <TextField
        label="Sac State email"
        value={email}
        onChangeText={setEmail}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Button label="Send reset instructions" onPress={() => void submit()} loading={sending} />
      <Text variant="caption" color="textMuted">
        For your university password, use Sac State&apos;s own account recovery instead.
      </Text>
      <TextLink label="Back to sign in" href="/sign-in" />
    </Screen>
  );
}
