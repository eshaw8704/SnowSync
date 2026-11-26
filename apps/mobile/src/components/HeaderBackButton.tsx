import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { colors, sizes, spacing } from '../theme';
import { Text } from './Text';

/** Props for {@link HeaderBackButton}. */
export interface HeaderBackButtonProps {
  /** Where the button leads, e.g. "Profile". Leave out to show a plain "Back". */
  label?: string;
  /** Where to go when there is no screen to go back to (opened from a deep link or a replace). */
  fallbackHref: Href;
}

/**
 * The header's back button for stacks whose first screen has no native back button (Sprint 4
 * feedback: some screens had no way out). Goes back when there is history, otherwise replaces with
 * `fallbackHref`. Modeled on the trip wizard's Cancel button (SS-145).
 */
export function HeaderBackButton({ label, fallbackHref }: HeaderBackButtonProps) {
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ? `Back to ${label}` : 'Go back'}
      onPress={goBack}
      hitSlop={8}
      style={styles.button}
    >
      <MaterialCommunityIcons name="chevron-left" size={24} color={colors.brandGreen} />
      <Text variant="label" color="brandGreen">
        {label ?? 'Back'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: sizes.minTouchTargetIos,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingRight: spacing.sm,
  },
});
