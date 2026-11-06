import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, sizes, spacing } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

/** What the field edits. "datetime" asks for the date, then the time. */
export type DateTimeFieldMode = 'date' | 'time' | 'datetime';

/** Props for {@link DateTimeField}. */
export interface DateTimeFieldProps {
  label: string;
  /** ISO 8601 instant, or null when nothing is chosen yet. */
  value: string | null;
  mode: DateTimeFieldMode;
  onChange: (iso: string) => void;
  error?: string;
  /** Used for the first picker when nothing is chosen yet. Defaults to now. */
  defaultValue?: Date;
  testID?: string;
}

const DISPLAY: Record<DateTimeFieldMode, Intl.DateTimeFormatOptions> = {
  date: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit' },
  datetime: { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
};

/** Shows `iso` the way the field displays it, in the phone's time zone. */
export function formatFieldValue(iso: string, mode: DateTimeFieldMode): string {
  return new Intl.DateTimeFormat('en-US', DISPLAY[mode])
    .format(new Date(iso))
    .replace(/[  ]/g, ' ');
}

/**
 * A labelled field that opens the native date or time picker (@react-native-community/datetimepicker).
 * On Android the picker is a dialog; on iOS a spinner appears under the field with a Done button.
 * Times are picked and shown in the phone's time zone and stored as UTC ISO strings.
 */
export function DateTimeField({
  label,
  value,
  mode,
  onChange,
  error,
  defaultValue,
  testID,
}: DateTimeFieldProps) {
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);
  const current = value ? new Date(value) : (defaultValue ?? new Date());
  const display = value ? formatFieldValue(value, mode) : 'Not set';
  const icon = mode === 'time' ? 'clock-outline' : 'calendar-month-outline';

  const choose = (date: Date) => {
    onChange(date.toISOString());
    if (Platform.OS === 'android') {
      setPicking(mode === 'datetime' && picking === 'date' ? 'time' : null);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="label">{label}</Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
        accessibilityHint={error}
        onPress={() => setPicking(mode === 'time' ? 'time' : 'date')}
        style={[styles.field, { borderColor: error ? colors.emergency : colors.border }]}
      >
        <Text color={value ? 'textPrimary' : 'textMuted'}>{display}</Text>
        <MaterialCommunityIcons name={icon} size={20} color={colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="caption" color="emergency" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      {picking ? (
        <>
          <DateTimePicker
            key={picking}
            testID={testID ? `${testID}-picker` : undefined}
            value={current}
            mode={Platform.OS === 'ios' && mode === 'datetime' ? 'datetime' : picking}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(_event, date) => choose(date)}
            onDismiss={() => setPicking(null)}
          />
          {Platform.OS === 'ios' ? (
            <Button label="Done" variant="secondary" onPress={() => setPicking(null)} />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  field: {
    minHeight: sizes.primaryButtonHeight,
    borderWidth: 1,
    borderRadius: radii.field,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
