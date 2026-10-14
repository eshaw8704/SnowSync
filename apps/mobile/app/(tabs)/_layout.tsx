// Eshanyadeep replaces the colors with theme tokens in SS-111

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

//colors
const ACTIVE_TINT = '#00573D'
const INACTIVE_TINT = '#64746F'

