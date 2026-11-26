import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { isSsoEnabled } from '../../api/config';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { colors, spacing } from '../../theme';

/** Props for {@link SacStateSsoButton}. */
export interface SacStateSsoButtonProps {
  /** The divider under the button, e.g. "or sign in with email". */
  dividerLabel: string;
}

/**
 * "Continue with Sac State SSO" (SS-38, Figma catalog 03): the primary way in once Sac State
 * approves the integration. Renders nothing while the EXPO_PUBLIC_SSO_ENABLED flag is off, so the
 * email path stays complete on its own.
 */
export function SacStateSsoButton({ dividerLabel }: SacStateSsoButtonProps) {
  if (!isSsoEnabled()) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <Button label="Continue with Sac State SSO" onPress={() => router.push('/sso')} />
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text variant="caption" color="textMuted">
          {dividerLabel}
        </Text>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
});
