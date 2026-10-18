import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { ServerStatusCard } from '../../src/features/devStatus/ServerStatusCard';

//Preofile tab, for now its only supposed ot show the developer tab as part of Sprint 1's scope
export default function ProfileScreen() {
  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Profile
      </Text>
      <ServerStatusCard />
    </Screen>
  );
}
