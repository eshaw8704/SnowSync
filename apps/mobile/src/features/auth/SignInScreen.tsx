import { loginRequestSchema, SIGN_IN_LOCK_MINUTES } from '@snowsync/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiClientError } from '../../api/apiClient';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Dialog } from '../../components/Dialog';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { TextLink } from '../../components/TextLink';
import { useAuthStore } from '../../state/authStore';
import { spacing } from '../../theme';
import { fieldErrors } from '../forms/fieldErrors';
import { logIn } from './loginApi';

type FailureDialog = 'invalid' | 'network' | 'locked' | null;

export function SignInScreen() {
  const expired = useAuthStore((state) => state.status === 'expired');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<FailureDialog>(null);

  const submit = async () => {
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const session = await logIn(parsed.data);
      useAuthStore.getState().sessionStarted(session);
    } catch (error) {
      setPassword('');
      if (error instanceof ApiClientError && error.code === 'RATE_LIMITED') {
        setDialog('locked');
      } else if (
        error instanceof ApiClientError &&
        (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')
      ) {
        setDialog('network');
      } else {
        setDialog('invalid');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const closeDialog = () => setDialog(null);
  const goToReset = () => {
    setDialog(null);
    router.push('/forgot-password');
  };

  return (
    <Screen scroll>
      <BrandHeader title="Welcome back, Hornet." subtitle="Sign in to your mountain community." />
      {expired ? (
        <Card>
          <Text variant="bodyStrong">Your session expired</Text>
          <Text color="textMuted">
            Sign in again to continue. Anything saved on this phone is still here.
          </Text>
        </Card>
      ) : null}
      <TextField
        label="Sac State email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        testID="sign-in-email"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        testID="sign-in-password"
      />
      <Button label="Sign in with email" onPress={() => void submit()} loading={submitting} />
      <View style={styles.links}>
        <TextLink label="Forgot password" href="/forgot-password" />
        <TextLink label="Create account" href="/sign-up" />
      </View>
      <Text variant="caption" color="textMuted">
        New member? Use your Sac State email. Membership must be approved before club access.
      </Text>

      <Dialog
        visible={dialog === 'invalid'}
        title="Email or password is incorrect"
        message="Check your Sac State email and password, then try again."
        primaryLabel="Try again"
        onPrimary={closeDialog}
        secondaryLabel="Forgot password"
        onSecondary={goToReset}
        onDismiss={closeDialog}
      />
      <Dialog
        visible={dialog === 'network'}
        title="Sign-in could not connect"
        message="We couldn't reach SnowSync, so you weren't signed in. Check your connection and try again. Your email is saved."
        primaryLabel="Retry sign in"
        onPrimary={closeDialog}
        secondaryLabel="Close"
        onSecondary={closeDialog}
        onDismiss={closeDialog}
      />
      <Dialog
        visible={dialog === 'locked'}
        title="Too many attempts"
        message={`Email sign-in is locked for ${SIGN_IN_LOCK_MINUTES} minutes. Reset your password to get back in sooner.`}
        primaryLabel="Reset password"
        onPrimary={goToReset}
        secondaryLabel="Back"
        onSecondary={closeDialog}
        onDismiss={closeDialog}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
