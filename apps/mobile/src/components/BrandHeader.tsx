import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import { Text } from './Text';

/** Props for {@link BrandHeader}. */
export interface BrandHeaderProps {
  /** Big headline, e.g. "Welcome back, Hornet." */
  title: string;
  /** One line under the title, e.g. "Sign in to your mountain community." */
  subtitle?: string;
  /** Small all-caps label above the title, e.g. "VERIFICATION". */
  eyebrow?: string;
}

/** The SnowSync wordmark plus a title block: the top of every sign-in, verification and onboarding screen. */
export function BrandHeader({ title, subtitle, eyebrow }: BrandHeaderProps) {
  return (
    <View style={styles.container}>
      <Text variant="section" color="brandGreen" accessibilityRole="text">
        SnowSync
      </Text>
      {eyebrow ? (
        <Text variant="label" color="brandGreen">
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text color="textMuted">{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginBottom: spacing.md },
});
