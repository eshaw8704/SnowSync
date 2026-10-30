import { membershipDecisionRequestSchema, type PendingMembershipItem } from '@snowsync/shared';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { selectHasPermission, useAuthStore } from '../../state/authStore';
import { spacing } from '../../theme';
import { fieldErrors } from '../forms/fieldErrors';
import { decideMembership, fetchPendingMemberships } from './approvalsApi';

type LoadState =
  { kind: 'loading' } | { kind: 'failed' } | { kind: 'loaded'; items: PendingMembershipItem[] };

type Pending = { kind: 'approve' | 'reject'; item: PendingMembershipItem } | null;

/**
 * Officer Membership approvals. Approving grants member access only;
 * rejecting needs a reason the requester will see. Every decision is audited by the server.
 */
export function ApprovalsScreen() {
  const canReview = useAuthStore(selectHasPermission('REVIEW_MEMBERSHIPS'));
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [deciding, setDeciding] = useState(false);
  const [notice, setNotice] = useState<string>();

  const request = useCallback(() => {
    fetchPendingMemberships().then(
      (items) => setState({ kind: 'loaded', items }),
      () => setState({ kind: 'failed' }),
    );
  }, []);

  useEffect(() => {
    if (canReview) request();
  }, [canReview, request]);

  if (!canReview) {
    return (
      <Screen>
        <ErrorState
          variant="forbidden"
          actionLabel="Back to Profile"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const close = () => {
    setPending(null);
    setReason('');
    setReasonError(undefined);
  };

  const confirm = async () => {
    if (!pending) return;
    const body =
      pending.kind === 'approve'
        ? { decision: 'APPROVE' as const }
        : { decision: 'REJECT' as const, reason };
    const parsed = membershipDecisionRequestSchema.safeParse(body);
    if (!parsed.success) {
      setReasonError(fieldErrors(parsed.error).reason);
      return;
    }
    setDeciding(true);
    try {
      await decideMembership(pending.item.userId, parsed.data);
      setNotice(
        pending.kind === 'approve'
          ? `${pending.item.displayName} approved. They can now complete member onboarding.`
          : `${pending.item.displayName}'s request was rejected.`,
      );
      setState((current) =>
        current.kind === 'loaded'
          ? {
              kind: 'loaded',
              items: current.items.filter((item) => item.userId !== pending.item.userId),
            }
          : current,
      );
      close();
    } catch (error) {
      setReasonError(
        error instanceof ApiClientError ? error.message : 'Could not save the decision. Try again.',
      );

      try {
        const items = await fetchPendingMemberships();
        setState({ kind: 'loaded', items });

        if (!items.some((item) => item.userId === pending.item.userId)) {
          close();
          setNotice('This membership request has already been handled.');
        }
      } catch {
        close();
        setState({ kind: 'failed' });
      }
    } finally {
      setDeciding(false);
    }
  };

  let body;
  if (state.kind === 'loading') {
    body = <LoadingSkeleton lines={3} accessibilityLabel="Loading membership requests" />;
  } else if (state.kind === 'failed') {
    body = (
      <ErrorState
        variant="network"
        onAction={() => {
          setState({ kind: 'loading' });
          request();
        }}
      />
    );
  } else if (state.items.length === 0) {
    body = (
      <EmptyState
        icon="account-check-outline"
        title="No pending requests"
        subtitle="Membership approvals"
        statusLabel="Clear"
        message="Everyone who asked to join has a decision."
        actionLabel="Back to Profile"
        onAction={() => router.back()}
      />
    );
  } else {
    body = state.items.map((item) => (
      <Card key={item.userId} style={styles.card}>
        <Text variant="bodyStrong">{item.displayName}</Text>
        <Text color="textMuted">
          {item.email} · requested {new Date(item.requestedAt).toLocaleDateString()}
        </Text>
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button label="Approve" onPress={() => setPending({ kind: 'approve', item })} />
          </View>
          <View style={styles.action}>
            <Button
              label="Reject"
              variant="secondary"
              onPress={() => setPending({ kind: 'reject', item })}
            />
          </View>
        </View>
      </Card>
    ));
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Membership approvals' }} />
      <Text color="textMuted">
        Approval grants member access, not officer privileges or trip registration.
      </Text>
      {notice ? (
        <Card>
          <Text color="brandGreen">{notice}</Text>
        </Card>
      ) : null}
      {body}
      <Dialog
        visible={pending?.kind === 'approve'}
        title={`Approve ${pending?.item.displayName ?? ''}?`}
        message={`Grants member access to the club. Does not assign Officer or register them for any trip.${reasonError ? `\n\n${reasonError}` : ''}`}
        primaryLabel="Approve membership"
        onPrimary={() => void confirm()}
        primaryLoading={deciding}
        secondaryLabel="Cancel"
        onSecondary={close}
        onDismiss={close}
      />
      <Dialog
        visible={pending?.kind === 'reject'}
        title="Reject this membership request?"
        message={`Reason required. ${pending?.item.displayName ?? 'They'} will see your explanation.`}
        primaryLabel="Reject request"
        primaryVariant="destructive"
        onPrimary={() => void confirm()}
        primaryLoading={deciding}
        secondaryLabel="Keep pending"
        onSecondary={close}
        onDismiss={close}
      >
        <TextField
          label="Rejection reason"
          value={reason}
          onChangeText={(value) => {
            setReason(value);
            setReasonError(undefined);
          }}
          error={reasonError}
        />
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: { flex: 1 },
});
