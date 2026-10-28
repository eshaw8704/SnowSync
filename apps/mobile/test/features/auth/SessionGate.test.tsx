import type { MeResponse } from '@snowsync/shared';
import { act, screen } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { SessionGate } from '../../../src/features/auth/SessionGate';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

const me: MeResponse = {
  id: 'u1',
  email: 'jacob@csus.edu',
  displayName: 'Jacob',
  role: 'MEMBER',
  membershipStatus: 'APPROVED',
  onboardingCompleted: true,
  permissions: [],
};
const session = {
  accessToken: 'a',
  accessTokenExpiresAt: '2026-10-20T10:15:00.000Z',
  refreshToken: 'r',
  refreshTokenExpiresAt: '2026-11-19T10:00:00.000Z',
};

//Tiny stand-in screens: the gate is tested without the real screens.
const label = (text: string) =>
  function Stub() {
    return <Text>{text}</Text>;
  };

function GroupStack() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

//The real app's group structure, with stub screens.
const routes = {
  _layout: SessionGate,
  '(auth)/_layout': GroupStack,
  '(auth)/sign-in': label('Sign in screen'),
  unverified: label('Unverified screen'),
  '(verification)/_layout': GroupStack,
  '(verification)/index': label('Verification screen'),
  '(onboarding)/_layout': GroupStack,
  '(onboarding)/index': label('Onboarding screen'),
  '(tabs)/_layout': GroupStack,
  '(tabs)/index': label('Home screen'),
  'officer/_layout': GroupStack,
  'officer/approvals': label('Approvals screen'),
};

describe('SessionGate', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('shows the restoring screen while the session loads', () => {
    renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByText('Signing you in…')).toBeTruthy();
  });

  it('routes each session state to exactly one screen group', async () => {
    useAuthStore.getState().signedOut();
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Sign in screen')).toBeTruthy();

    act(() => {
      useAuthStore.getState().sessionStarted(session);
      useAuthStore.getState().userLoaded({ ...me, membershipStatus: 'PENDING_APPROVAL' });
    });
    expect(await screen.findByText('Verification screen')).toBeTruthy();

    act(() => useAuthStore.getState().userLoaded({ ...me, onboardingCompleted: false }));
    expect(await screen.findByText('Onboarding screen')).toBeTruthy();

    act(() => useAuthStore.getState().userLoaded(me));
    expect(await screen.findByText('Home screen')).toBeTruthy();

    act(() => useAuthStore.getState().sessionUnverified(me));
    expect(await screen.findByText('Unverified screen')).toBeTruthy();

    act(() => useAuthStore.getState().sessionExpired());
    expect(await screen.findByText('Sign in screen')).toBeTruthy();
  });
});
