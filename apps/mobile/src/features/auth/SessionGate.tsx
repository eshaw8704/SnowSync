import { Stack } from 'expo-router';
import { selectSessionRoute, useAuthStore } from '../../state/authStore';
import { SessionRestoringScreen } from './SessionRestoringScreen';

//The root navigation gate. Exactly one screen group is reachable at a time, chosen from the
//session (see selectSessionRoute). Changing the store is how every screen "navigates" between
//groups: Expo Router's Stack.Protected redirects automatically when a guard flips.
export function SessionGate() {
  const route = useAuthStore(selectSessionRoute);
  if (route === 'loading') {
    return <SessionRestoringScreen />;
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={route === 'auth'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={route === 'unverified'}>
        <Stack.Screen name="unverified" />
      </Stack.Protected>
      <Stack.Protected guard={route === 'verification'}>
        <Stack.Screen name="(verification)" />
      </Stack.Protected>
      <Stack.Protected guard={route === 'onboarding'}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={route === 'app'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="officer" />
      </Stack.Protected>
    </Stack>
  );
}
