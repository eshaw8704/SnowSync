import type { HealthReport } from '@snowsync/shared';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiClientError } from '../../api/apiClient';
import { Card } from '../../components/Card';
import { ErrorState, type ErrorVariant } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Text } from '../../components/Text';
import { spacing } from '../../theme';
import { fetchHealth } from './healthApi';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; report: HealthReport }
  | { kind: 'failed'; variant: ErrorVariant };

// NETWORK_ERROR and TIMEOUT mean "unreachable"; everything else is unexpected
function variantFor(error: unknown): ErrorVariant {
  if (
    error instanceof ApiClientError &&
    (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')
  ) {
    return 'network';
  }
  return 'unknown';
}

//Developer-only card that proves the app can reach the server (SS-23).
//Renders nothing in release builds.
export function ServerStatusCard() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  //Fetches once and stores the outcome. State changes happen only after the response
  const request = useCallback(() => {
    fetchHealth().then(
      (report) => setState({ kind: 'loaded', report }),
      (error: unknown) => setState({ kind: 'failed', variant: variantFor(error) }),
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  const retry = useCallback(() => {
    setState({ kind: 'loading' });
    request();
  }, [request]);

  if (!__DEV__) {
    return null;
  }

  if (state.kind === 'loading') {
    return (
      <Card testID="server-status-card">
        <LoadingSkeleton showBlock={false} accessibilityLabel="Loading server status" />
      </Card>
    );
  }

  if (state.kind === 'failed') {
    return (
      <ErrorState
        testID="server-status-card"
        variant={state.variant}
        title={state.variant === 'network' ? 'Server: unreachable' : undefined}
        onAction={retry}
        actionLabel="Retry"
      />
    );
  }

  return (
    <Card testID="server-status-card" style={styles.card}>
      <Text variant="label" color="textMuted">
        DEVELOPER · SERVER STATUS
      </Text>
      <Text variant="bodyStrong">Server: {state.report.status}</Text>
      <View style={styles.row}>
        <Text color="textMuted">Database: {state.report.database}</Text>
        <Text color="textMuted">Uptime: {state.report.uptimeSeconds}s</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
