import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

/** Props for {@link Screen}. */
export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  testID?: string;
}


export function Screen({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  testID,
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.safeArea} testID={testID}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screenInset, paddingVertical: spacing.md, gap: spacing.md },
  fill: { flex: 1 },
});
