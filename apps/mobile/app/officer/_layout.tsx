import { Stack } from 'expo-router';

/** Officer and executive tools, opened from the Profile tab. Each screen checks its own permission. */
export default function OfficerLayout() {
  return <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Profile' }} />;
}