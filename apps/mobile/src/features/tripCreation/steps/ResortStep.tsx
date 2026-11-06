import Slider from '@react-native-community/slider';
import {
  GEOFENCE_RADIUS_MAX_METERS,
  GEOFENCE_RADIUS_MIN_METERS,
  RESORTS,
  findResort,
} from '@snowsync/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { colors, radii, sizes, spacing } from '../../../theme';
import type { StepProps } from './stepProps';

/** "Resort boundary · 500 m around base lodge" */
export function geofenceLabel(radiusMeters: number, baseLodgeLabel: string): string {
  return `Resort boundary · ${radiusMeters} m around ${baseLodgeLabel}`;
}

/**
 * Step 2 · Resort and geofence (Figma catalog 09). The resort comes from the shared RESORTS list;
 * the slider sets the check-in radius (100–2000 m, steps of 50). There is no map in Sprint 3: the
 * map provider is still to be decided, so the base-lodge coordinates are shown as text.
 */
export function ResortStep({ value, onChange, errors }: StepProps) {
  const resort = value.resortName ? findResort(value.resortName) : undefined;
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }} accessibilityRole="radiogroup" accessibilityLabel="Resort">
        <Text variant="label">Resort</Text>
        {RESORTS.map((option) => {
          const selected = option.name === value.resortName;
          return (
            <Pressable
              key={option.name}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange({ resortName: option.name })}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.dot, selected && styles.dotSelected]} />
              <Text variant="bodyStrong">{option.name}</Text>
            </Pressable>
          );
        })}
        {errors.resortName ? (
          <Text variant="caption" color="emergency">
            {errors.resortName}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="label">Check-in geofence</Text>
        <Text>{geofenceLabel(value.radiusMeters, resort?.baseLodgeLabel ?? 'base lodge')}</Text>
        <Slider
          accessibilityLabel="Check-in radius in meters"
          minimumValue={GEOFENCE_RADIUS_MIN_METERS}
          maximumValue={GEOFENCE_RADIUS_MAX_METERS}
          step={50}
          value={value.radiusMeters}
          onValueChange={(radius) => onChange({ radiusMeters: Math.round(radius) })}
          minimumTrackTintColor={colors.brandGreen}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.brandGreen}
          testID="trip-radius"
        />
        {errors.radiusMeters ? (
          <Text variant="caption" color="emergency">
            {errors.radiusMeters}
          </Text>
        ) : null}
      </View>
      {resort ? (
        <Text variant="caption" color="textMuted">
          Base lodge: {resort.latitude.toFixed(5)}, {resort.longitude.toFixed(5)}. Automatic
          check-in uses this geofence and a verified registration.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: sizes.minTouchTargetAndroid,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.field,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.brandGreen, borderWidth: 2 },
  dot: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.subtleFill },
  dotSelected: { backgroundColor: colors.brandGreen },
});
