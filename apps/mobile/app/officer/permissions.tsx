import { Stack } from 'expo-router';
import { RolePermissionsScreen } from '../../src/features/officer/RolePermissionsScreen';

/** Route /officer/permissions (executives only; the screen checks). */
export default function RolePermissionsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Role permissions' }} />
      <RolePermissionsScreen />
    </>
  );
}
