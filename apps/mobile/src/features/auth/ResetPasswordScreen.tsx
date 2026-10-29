import { PASSWORD_MIN_LENGTH, resetPasswordRequestSchema } from '@snowsync/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { fieldErrors } from '../forms/fieldErrors';
import { resetPassword } from './passwordResetApi';

/**
 * Lets users create a new password using the reset link
 * sent to their email.
 */
export function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [linkInvalid, setLinkInvalid] = useState(!token);
  const [networkFailed, setNetworkFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  if (linkInvalid) {
    return (
      <Screen scroll>
        <BrandHeader title="This reset link can't be used" />
        <ErrorState
          variant="notFound"
          title="Link invalid or expired"
          message="Reset links work once, for 30 minutes. Request a new one to choose a password."
          actionLabel="Request a new link"
          onAction={() => router.replace('/forgot-password')}
        />
      </Screen>
    );
  }

  const submit = async () => {
    const parsed = resetPasswordRequestSchema.safeParse({ token, password });
    const nextErrors = parsed.success ? {} : fieldErrors(parsed.error);
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    setErrors(nextErrors);
    if (!parsed.success || nextErrors.confirmPassword) {
      return;
    }
    setNetworkFailed(false);
    setSaving(true);
    try {
      await resetPassword(parsed.data.token, parsed.data.password);
      router.replace('/reset-success');
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details?.reason === 'RESET_TOKEN_INVALID') {
        setLinkInvalid(true);
      } else {
        setNetworkFailed(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <BrandHeader
        title="Set a new password"
        subtitle="Your reset link is verified. Choose a strong password."
      />
      {networkFailed ? (
        <ErrorState variant="network" actionLabel="Try again" onAction={() => void submit()} />
      ) : null}
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        helperText={`At least ${PASSWORD_MIN_LENGTH} characters. Never share your password or reset link.`}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Button label="Reset password" onPress={() => void submit()} loading={saving} />
    </Screen>
  );
}
