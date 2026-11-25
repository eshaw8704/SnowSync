import type { AuthSession } from '@snowsync/shared';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ApiClientError } from '../../api/apiClient';
import { StyleSheet } from 'react-native';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { useAuthStore } from '../../state/authStore';
import { spacing } from '../../theme';
import { exchangeSsoCode, parseSsoReturn, SSO_ERROR_MESSAGES } from './ssoApi';
import { goBackFromSso } from './SsoRedirectScreen';

/**
 * One exchange per code for the life of the app. A code works once, and on Android the same code
 * can open two completion screens (the deep link and the redirect screen), so every screen with
 * that code waits on the same request instead of sending its own.
 */
const exchanges = new Map<string, Promise<AuthSession>>();

function exchangeOnce(code: string): Promise<AuthSession> {
  let exchange = exchanges.get(code);
  if (!exchange) {
    exchange = exchangeSsoCode(code);
    exchanges.set(code, exchange);
  }
  return exchange;
}

/** Why the exchange for a code failed: the network, or the server refused the code. */
type ExchangeFailure = { code: string; reason: 'network' | 'refused' };

const EXCHANGE_FAILURE_MESSAGES: Record<ExchangeFailure['reason'], string> = {
  network:
    "We couldn't reach SnowSync to finish signing you in. Check your connection and try Sac State sign-in again.",
  refused: 'That sign-in link expired or was already used. Try Sac State sign-in again.',
};

/**
 * "Completing sign in…" (SS-38, Figma catalog 03 page 14). Route /sso-complete?code=… — reached
 * from the redirect screen or straight from the deep link. Trades the one-time code for a session;
 * the session gate then opens the right place. On failure, explains and leads back.
 */
export function SsoCompleteScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [failure, setFailure] = useState<ExchangeFailure | null>(null);
  const query = new URLSearchParams();
  if (params.code) query.set('code', params.code);
  if (params.error) query.set('error', params.error);
  const result = parseSsoReturn(`?${query.toString()}`);
  const code = 'code' in result ? result.code : null;

  useEffect(() => {
    if (!code) return;
    // A new code (another deep link onto this same screen) gets its own exchange; a result that
    // arrives after the code changed or the screen closed is ignored.
    let current = true;
    exchangeOnce(code).then(
      (session) => {
        if (current) useAuthStore.getState().sessionStarted(session);
      },
      (error: unknown) => {
        if (!current) return;
        const network =
          error instanceof ApiClientError &&
          (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT');
        setFailure({ code, reason: network ? 'network' : 'refused' });
      },
    );
    return () => {
      current = false;
    };
  }, [code]);

  // Only a failure for the code on screen counts, so a new code starts back at "Completing…".
  const failed = failure && failure.code === code ? failure : null;
  const message =
    'error' in result
      ? SSO_ERROR_MESSAGES[result.error]
      : failed
        ? EXCHANGE_FAILURE_MESSAGES[failed.reason]
        : null;

  return (
    <Screen scroll>
      <Text variant="caption" color="textMuted" style={styles.caption}>
        {message ? 'SIGN-IN STOPPED' : 'VERIFYING'}
      </Text>
      <BrandHeader title={message ? "We couldn't sign you in" : 'Completing sign in…'} />
      {message ? (
        <>
          <Card>
            <Text>{message}</Text>
          </Card>
          <Button label="Back" onPress={goBackFromSso} />
        </>
      ) : (
        <Card style={styles.card}>
          <Text variant="bodyStrong">Returning from Sac State SSO.</Text>
          <Text color="textMuted">Checking your membership and restoring your destination.</Text>
          <LoadingSkeleton lines={1} showBlock={false} accessibilityLabel="Completing sign in" />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  caption: { letterSpacing: 0.6 },
  card: { gap: spacing.xs },
});
