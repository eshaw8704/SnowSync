import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export interface StatusLayoutProps {
  children: ReactNode;
  /** The screen's buttons, pinned to the bottom: the primary action first, then the way out. */
  footer?: ReactNode;
  testID?: string;
}

export function StatusLayout({ children, footer, testID }: StatusLayoutProps) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea} testID={testID}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screenInset, paddingVertical: spacing.md, gap: spacing.md },
  footer: {
    paddingHorizontal: spacing.screenInset,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
});
