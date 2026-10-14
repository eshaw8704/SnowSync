import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { colors, fontFamily, sizes } from '../../src/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** The four member tabs, in this exact order. "Active" (5th tab) arrives in Sprint 6. */
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline' },
  { name: 'trips', title: 'Trips', icon: 'image-filter-hdr' },
  { name: 'inbox', title: 'Inbox', icon: 'bell-outline' },
  { name: 'profile', title: 'Profile', icon: 'account-outline' },
];

/** Bottom tab navigator shown to every signed-in member. */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandGreen,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarItemStyle: { minHeight: sizes.minTouchTargetAndroid },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fontFamily.semibold },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: `${tab.title} tab`,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={tab.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
