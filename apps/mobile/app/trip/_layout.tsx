import { Stack } from 'expo-router';
import { HeaderBackButton } from '../../src/components/HeaderBackButton';
import { colors } from '../../src/theme';

/**
 * Every trip screen opened from the Trips and Home tabs: detail, registration, roster, the
 * creation wizard, the officer management and edit screens. The URL prefix is /trip (singular)
 * because /trips is the Trips tab. Every screen gets a back button, including the first one in
 * the stack, which has no native back button; the wizard replaces it with its own Cancel.
 */
export default function TripLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerTintColor: colors.brandGreen,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitle: '',
        headerLeft: () => <HeaderBackButton fallbackHref="/trips" />,
      }}
    />
  );
}
