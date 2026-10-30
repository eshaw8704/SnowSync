import { Stack } from 'expo-router';

/** Onboarding runs once, right after approval: steps 1 to 7 in order. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
