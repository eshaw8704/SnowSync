import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { colors, spacing } from '../../theme';
import { openSacStateSignIn, SSO_ERROR_MESSAGES } from './ssoApi';

/**
 * Back to whichever screen opened SSO (Sign in or Sign up). Falls back to Sign in when there is
 * nothing to go back to, e.g. when the deep link opened the app straight onto /sso-complete.
 */
export function goBackFromSso(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/sign-in');
}

/**
 * "Continue at Sac State" (SS-38, Figma catalog 03 page 14, SSO / Redirect). Explains the secure
 * redirect, then opens Sac State's own sign-in page. "Back" always leads out.
 */
export function SsoRedirectScreen() {
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const open = async () => {
    setOpening(true);
    setMessage(null);
    try {
      const result = await openSacStateSignIn();
      if ('code' in result) {
        // On Android the deep link may also open /sso-complete with this code; SsoCompleteScreen
        // shares one exchange per code, so the code is still sent to the server only once.
        router.replace(`/sso-complete?code=${encodeURIComponent(result.code)}`);
        return;
      }
      setMessage(SSO_ERROR_MESSAGES[result.error]);
    } catch {
      setMessage(SSO_ERROR_MESSAGES.FAILED);
    } finally {
      setOpening(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="caption" color="textMuted" style={styles.caption}>
        SSO REDIRECT
      </Text>
      <BrandHeader title="Continue at Sac State" />
      <Card style={styles.card}>
        <Text variant="bodyStrong">Redirecting to Sacramento State…</Text>
        <Text color="textMuted">
          You will sign in securely on Sacramento State&apos;s SSO page.
        </Text>
      </Card>
      <View style={styles.info} accessible>
        <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.location} />
        <Text color="textMuted" style={styles.infoText}>
          Secure redirect: Sac State authentication. SnowSync does not see or store your university
          password.
        </Text>
      </View>
      {message ? (
        <Card testID="sso-message">
          <Text color="emergency">{message}</Text>
        </Card>
      ) : null}
      <Button label="Continue to Sac State" onPress={() => void open()} loading={opening} />
      <Button label="Back" variant="secondary" disabled={opening} onPress={goBackFromSso} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  caption: { letterSpacing: 0.6 },
  card: { gap: spacing.xs },
  info: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  infoText: { flex: 1 },
});
