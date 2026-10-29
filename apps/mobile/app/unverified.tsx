import { ROLE_LABELS } from '@snowsync/shared';
import { useState } from 'react';
import { BrandHeader } from '../src/components/BrandHeader';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { restoreSession, signOut } from '../src/features/auth/sessionManager';
import { useAuthStore } from '../src/state/authStore';

//Figma catalog 02, Startup / Network / Verification Failed. The server could not be reached at
//launch, so nothing live is shown until the session is verified.
export default function UnverifiedSessionScreen() {
  const cachedUser = useAuthStore((state) => state.user);
  const [retrying, setRetrying] = useState(false);
  const retry = () => {
    setRetrying(true);
    void restoreSession().finally(() => setRetrying(false));
  };
  return (
    <Screen scroll>
      <BrandHeader
        eyebrow="NETWORK UNAVAILABLE"
        title="Unable to verify your session"
        subtitle="We cannot reach SnowSync right now. Retry to sign in."
      />
      {cachedUser ? (
        <Card>
          <Text variant="label" color="textMuted">
            SAVED ON THIS PHONE (READ-ONLY)
          </Text>
          <Text variant="bodyStrong">{cachedUser.displayName}</Text>
          <Text color="textMuted">
            {ROLE_LABELS[cachedUser.role]} · {cachedUser.email}
          </Text>
        </Card>
      ) : null}
      <Card>
        <Text color="textMuted">
          Your cached information stays on this device. Live features resume only after your session
          is verified.
        </Text>
      </Card>
      <Button label="Retry verification" onPress={retry} loading={retrying} />
      <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}
