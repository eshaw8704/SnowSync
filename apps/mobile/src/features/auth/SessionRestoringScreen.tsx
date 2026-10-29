import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BrandHeader } from '../../components/BrandHeader';
import { Screen } from '../../components/Screen';
import { colors, spacing } from '../../theme';

//Shown while the saved session is checked at launch (Figma catalog 02, Startup / Session / Restoring).
export function SessionRestoringScreen() {
  return (
    <Screen>
      <View style={styles.center} accessibilityLabel="Restoring your session" accessible>
        <BrandHeader
          title="Signing you in…"
          subtitle="Restoring your session and your last trip context."
        />
        <ActivityIndicator color={colors.brandGreen} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: spacing.lg },
});
