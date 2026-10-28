import { router, useLocalSearchParams } from 'expo-router';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';

export function InstructionsSentScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <Screen scroll>
      <BrandHeader title="Check your inbox" />
      <Card>
        <Text>
          If an account exists for {email ?? 'that email'}, reset instructions have been sent. The
          link works once, for 30 minutes.
        </Text>
        <Text color="textMuted">Check spam, and open the link on this phone.</Text>
      </Card>
      <Button label="Back to sign in" onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}
