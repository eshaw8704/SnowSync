import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { colors, radii, shadow, spacing } from '../theme';

/** Props for {@link Card}. */
export interface CardProps extends ViewProps {
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({ padding = spacing.md, style, children, ...rest }: CardProps) {
  return (
    <View {...rest} style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
});
