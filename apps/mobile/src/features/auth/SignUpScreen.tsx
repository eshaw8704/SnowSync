import { PASSWORD_MIN_LENGTH, signupRequestSchema } from '@snowsync/shared';
import { useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { TextLink } from '../../components/TextLink';
import { useAuthStore } from '../../state/authStore';
import { fieldErrors, serverFieldErrors } from '../forms/fieldErrors';
import { signUp } from './signupApi';

/**
 * Create account. A new account is PENDING_APPROVAL, so after
 * sign-up the root gate shows membership verification, never the club.
 */
export function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [networkFailed, setNetworkFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const parsed = signupRequestSchema.safeParse({ displayName, email, password });
    const nextErrors = parsed.success ? {} : fieldErrors(parsed.error);
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    setErrors(nextErrors);
    if (!parsed.success || nextErrors.confirmPassword) {
      return;
    }
    setNetworkFailed(false);
    setSubmitting(true);
    try {
      const session = await signUp(parsed.data);
      useAuthStore.getState().sessionStarted(session);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'CONFLICT') {
        setErrors({ email: error.message });
      } else if (error instanceof ApiClientError && error.code === 'VALIDATION_FAILED') {
        setErrors(serverFieldErrors(error.details));
      } else {
        setNetworkFailed(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <BrandHeader
        title="Join the crew."
        subtitle="Create your SnowSync account. Membership approval follows sign-up."
      />
      {networkFailed ? (
        <ErrorState
          variant="network"
          title="Your account wasn't created"
          message="We couldn't reach SnowSync. Check your connection and try again; what you typed is still here."
          actionLabel="Try again"
          onAction={() => void submit()}
        />
      ) : null}
      <TextField
        label="Full name"
        value={displayName}
        onChangeText={setDisplayName}
        error={errors.displayName}
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Sac State email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        helperText={`Use at least ${PASSWORD_MIN_LENGTH} characters.`}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Text variant="caption" color="textMuted">
        Creating an account doesn&apos;t approve your club membership.
      </Text>
      <Button label="Create account" onPress={() => void submit()} loading={submitting} />
      <TextLink label="Back to sign in" href="/sign-in" />
    </Screen>
  );
}
