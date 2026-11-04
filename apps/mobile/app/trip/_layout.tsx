import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

/**
 * Every trip screen opened from the Trips and Home tabs: detail, the creation wizard, the officer
 * management and edit screens. A plain stack with a back button. The URL prefix is /trip
 * (singular) because /trips is the Trips tab.
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
      }}
    />
  );
}
