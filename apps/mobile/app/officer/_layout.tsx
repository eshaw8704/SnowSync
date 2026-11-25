import { Stack } from 'expo-router';
import { HeaderBackButton } from '../../src/components/HeaderBackButton';
import { colors } from '../../src/theme';

/**
 * Officer and executive tools, opened from the Profile tab. Each screen checks its own permission.
 * Every screen, including the first, gets a back button to Profile.
 */
export default function OfficerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Profile',
        headerTintColor: colors.brandGreen,
        headerLeft: () => <HeaderBackButton label="Profile" fallbackHref="/profile" />,
      }}
    />
  );
}
