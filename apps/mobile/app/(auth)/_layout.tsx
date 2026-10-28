import { Stack } from 'expo-router';

//Signed-out screens: sign-in (first), sign-up and password reset.
export const unstable_settings = { initialRouteName: 'sign-in' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
