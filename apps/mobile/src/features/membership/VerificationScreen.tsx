import type { MembershipStatusResponse } from '@snowsync/shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { useAuthStore } from '../../state/authStore';
import { loadMe, signOut } from '../auth/sessionManager';
import { fetchMembershipStatus } from './membershipApi';

type LoadState =
  { kind: 'loading' } | { kind: 'failed' } | { kind: 'loaded'; status: MembershipStatusResponse };

//Membership verification (Figma catalog 04 · 1). One screen that shows the right outcome for the
//account: pending, approved, rejected (with the officer's reason), not on the list, or "status
//unavailable", which is a load error and never shown as a rejection.
export function VerificationScreen() {
  const user = useAuthStore((state) => state.user);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [continuing, setContinuing] = useState(false);

  const request = useCallback(() => {
    fetchMembershipStatus().then(
      (status) => setState({ kind: 'loaded', status }),
      () => setState({ kind: 'failed' }),
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  const refresh = () => {
    setState({ kind: 'loading' });
    request();
  };

  const continueToSetup = () => {
    setContinuing(true);
    // Reloading /me moves the gate to onboarding (or the app) now that membership is APPROVED.
    void loadMe().finally(() => setContinuing(false));
  };

  const signOutButton = (
    <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
  );
  const codeButton = (
    <Button
      label="Enter a club code"
      variant="secondary"
      onPress={() => router.push('/club-code')}
    />
  );

  if (state.kind === 'loading') {
    return (
      <Screen scroll>
        <BrandHeader
          eyebrow="VERIFICATION"
          title="Checking your membership…"
          subtitle={user?.email}
        />
        <LoadingSkeleton accessibilityLabel="Checking your membership" />
      </Screen>
    );
  }

  if (state.kind === 'failed') {
    return (
      <Screen scroll>
        <BrandHeader eyebrow="VERIFICATION" title="Approval status unavailable" />
        <ErrorState
          variant="unknown"
          title="We couldn't load your membership decision"
          message="This isn't a rejection. Your account is safe. Try again in a moment."
          actionLabel="Retry status"
          onAction={refresh}
        />
        {signOutButton}
      </Screen>
    );
  }

  const { status, requestedAt, rejectionReason } = state.status;

  if (status === 'APPROVED') {
    return (
      <Screen scroll>
        <BrandHeader eyebrow="VERIFICATION · APPROVED" title="Welcome to the club!" />
        <Card>
          <Text>Your membership is approved. Set up a few essentials before your first trip.</Text>
        </Card>
        <Button label="Set up my profile" onPress={continueToSetup} loading={continuing} />
      </Screen>
    );
  }

  if (status === 'REJECTED') {
    return (
      <Screen scroll>
        <BrandHeader eyebrow="VERIFICATION · REJECTED" title="Membership not approved" />
        <Card>
          <Text variant="label" color="textMuted">
            WHAT HAPPENED
          </Text>
          <Text>An officer reviewed your request and could not approve it.</Text>
          {rejectionReason ? <Text variant="bodyStrong">Reason: {rejectionReason}</Text> : null}
          <Text color="textMuted">
            Contact the club for clarification, or use a club code from an officer.
          </Text>
        </Card>
        {codeButton}
        {signOutButton}
      </Screen>
    );
  }

  if (status === 'NOT_AUTHORIZED') {
    return (
      <Screen scroll>
        <BrandHeader eyebrow="VERIFICATION · NOT AUTHORIZED" title="Not on the approved list" />
        <Card>
          <Text>
            {user?.email} isn&apos;t on the club&apos;s approved membership list. Contact an officer
            to request a review.
          </Text>
        </Card>
        {codeButton}
        {signOutButton}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <BrandHeader eyebrow="VERIFICATION · PENDING APPROVAL" title="You're on the list." />
      <Card>
        <Text variant="label" color="textMuted">
          SUBMISSION
        </Text>
        <Text variant="bodyStrong">{user?.displayName}</Text>
        <Text color="textMuted">
          {user?.email} · submitted {new Date(requestedAt).toLocaleDateString()}
        </Text>
      </Card>
      <Card>
        <Text variant="label" color="textMuted">
          WHAT HAPPENS NEXT
        </Text>
        <Text>
          Waiting for officer approval. An officer checks your club membership, then you can set up
          your profile.
        </Text>
      </Card>
      <Button label="Refresh approval status" onPress={refresh} />
      {codeButton}
      {signOutButton}
    </Screen>
  );
}
