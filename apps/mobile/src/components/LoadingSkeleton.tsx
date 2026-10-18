import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

/** Props for {@link LoadingSkeleton}. */
export interface LoadingSkeletonProps {
  lines?: number;
  showBlock?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Placeholder shown while content loads. Pulses softly, and stays still when the
 * OS "Reduce Motion" setting is on.
 */
export function LoadingSkeleton({
  lines = 2,
  showBlock = true,
  accessibilityLabel = 'Loading',
  testID,
}: LoadingSkeletonProps) {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [opacity] = useState(() => new Animated.Value(1));

  // Keep the number of lines within a safe range.
  const safeLines = Number.isFinite(lines) ? Math.max(0, Math.min(10, Math.floor(lines))) : 2;

  useEffect(() => {
    let mounted = true;
    let receivedChangeEvent = false;

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      receivedChangeEvent = true;
      setReduceMotion(enabled);
    });

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        // Ignore an outdated result if a newer event was received.
        if (mounted && !receivedChangeEvent) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {
        // Allow animation if the accessibility query fails.
        if (mounted && !receivedChangeEvent) {
          setReduceMotion(false);
        }
      });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();
    return () => pulse.stop();
  }, [reduceMotion, opacity]);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      <Animated.View style={[styles.stack, { opacity }]}>
        {showBlock && <View style={styles.block} />}
        {Array.from({ length: safeLines }, (_, index) => (
          <View
            key={index}
            style={[styles.line, { width: index === safeLines - 1 ? '60%' : '100%' }]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  block: {
    height: 72,
    borderRadius: radii.field,
    backgroundColor: colors.subtleFill,
  },
  line: {
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.subtleFill,
  },
});
