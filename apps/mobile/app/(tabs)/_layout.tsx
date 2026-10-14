// Eshanyadeep replaces the colors with theme tokens in SS-111

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

//colors
const ACTIVE_TINT = '#00573D'
const INACTIVE_TINT = '#64746F'

const TABS: { name: string; title: string; icon: IconName } [] = [
  { name: 'index', title: 'Home', icon: 'home-outline' },
  { name: 'trips', title: 'Trips', icon: 'image-filter-hdr' },
  { name: 'inbox', title: 'Inbox', icon: 'bell-outline' },
  { name: 'profile', title: 'Profile', icon: 'account-outline' },
];

// Bottom tab navigator shown for every member
