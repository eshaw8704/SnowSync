import { router } from 'expo-router';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';

/** Shows confirmation after a successful password reset. */
export function ResetSuccessScreen() {
  return (
    <Screen scroll>
      <BrandHeader eyebrow="SUCCESS" title="Password reset." />
      <Card>
        <Text>Your password was changed. Sign in with your new password to continue.</Text>
        <Text color="textMuted">
          For your safety, SnowSync signed you out on every other device.
        </Text>
      </Card>
      <Button label="Back to sign in" onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}
