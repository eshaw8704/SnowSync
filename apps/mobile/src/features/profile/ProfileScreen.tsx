import { MembershipStatus, ROLE_LABELS } from '@snowsync/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Card } from '../../components/Card';
import { Dialog } from '../../components/Dialog';
import { ListRow } from '../../components/ListRow';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { selectHasPermission, selectIsExecutive, useAuthStore } from '../../state/authStore';
import { signOut } from '../auth/sessionManager';
import { ServerStatusCard } from '../devStatus/ServerStatusCard';

const MEMBERSHIP_LABELS: Record<MembershipStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  NOT_AUTHORIZED: 'Not authorized',
  DEACTIVATED: 'Deactivated',
};

/**
 * Profile screen with account details, officer tools, and sign out.
 * Officer tools are shown based on the user's permissions.
 */
export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const canReview = useAuthStore(selectHasPermission('REVIEW_MEMBERSHIPS'));
  const isExecutive = useAuthStore(selectIsExecutive);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const doSignOut = () => {
    setSigningOut(true);
    void signOut();
  };

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Profile
      </Text>
      {user ? (
        <Card>
          <Text variant="section">{user.displayName}</Text>
          <Text color="textMuted">
            {ROLE_LABELS[user.role]} · {MEMBERSHIP_LABELS[user.membershipStatus]}
          </Text>
          <Text color="textMuted">{user.email}</Text>
        </Card>
      ) : null}
      {canReview || isExecutive ? (
        <Card>
          <Text variant="label" color="textMuted">
            OFFICER TOOLS
          </Text>
          {canReview ? (
            <ListRow
              label="Membership approvals"
              description="Review people waiting to join"
              onPress={() => router.push('/officer/approvals')}
            />
          ) : null}
          {isExecutive ? (
            <ListRow
              label="Role permissions"
              description="Choose what Members and Officers can do"
              onPress={() => router.push('/officer/permissions')}
            />
          ) : null}
        </Card>
      ) : null}
      <Card>
        <Text variant="label" color="textMuted">
          ACCOUNT
        </Text>
        <ListRow label="Sign out" destructive onPress={() => setConfirmSignOut(true)} />
      </Card>
      <ServerStatusCard />
      <Dialog
        visible={confirmSignOut}
        title="Sign out of SnowSync?"
        message="Your session closes on this phone. You can sign back in any time."
        primaryLabel="Sign out"
        primaryVariant="destructive"
        primaryLoading={signingOut}
        onPrimary={doSignOut}
        secondaryLabel="Stay signed in"
        onSecondary={() => setConfirmSignOut(false)}
        onDismiss={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}
