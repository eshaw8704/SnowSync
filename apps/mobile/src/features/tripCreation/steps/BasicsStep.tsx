import { View } from 'react-native';
import { DateTimeField } from '../../../components/DateTimeField';
import { Text } from '../../../components/Text';
import { TextField } from '../../../components/TextField';
import { spacing } from '../../../theme';
import type { StepProps } from './stepProps';

/** Copies the calendar day of `day` onto `iso`, keeping its time (or `hour`:00 when unset). */
export function withDay(iso: string | null, day: Date, hour: number): string {
  const result = iso ? new Date(iso) : new Date(day);
  if (!iso) result.setHours(hour, 0, 0, 0);
  result.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return result.toISOString();
}

/** Copies the clock time of `time` onto `iso`, keeping its day (or today when unset). */
export function withTime(iso: string | null, time: Date): string {
  const result = iso ? new Date(iso) : new Date(time);
  result.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return result.toISOString();
}

/** Step 1 · Basics (Figma catalog 09): trip name, description, date, start and end time. */
export function BasicsStep({ value, onChange, errors }: StepProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <TextField
        label="Trip name"
        value={value.name}
        onChangeText={(name) => onChange({ name })}
        error={errors.name}
        placeholder="Sugar Bowl club day"
        maxLength={80}
        testID="trip-name"
      />
      <TextField
        label="Description"
        value={value.description}
        onChangeText={(description) => onChange({ description })}
        error={errors.description}
        placeholder="A full day on snow with the Sac State crew."
        maxLength={1000}
        testID="trip-description"
      />
      <DateTimeField
        label="Date"
        mode="date"
        value={value.startsAt}
        error={errors.startsAt && !value.startsAt ? errors.startsAt : undefined}
        onChange={(iso) => {
          const day = new Date(iso);
          onChange({
            startsAt: withDay(value.startsAt, day, 8),
            endsAt: withDay(value.endsAt, day, 16),
          });
        }}
        testID="trip-date"
      />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <DateTimeField
            label="Start time"
            mode="time"
            value={value.startsAt}
            error={value.startsAt ? errors.startsAt : undefined}
            onChange={(iso) => onChange({ startsAt: withTime(value.startsAt, new Date(iso)) })}
            testID="trip-start-time"
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateTimeField
            label="End time"
            mode="time"
            value={value.endsAt}
            error={errors.endsAt}
            onChange={(iso) => onChange({ endsAt: withTime(value.endsAt, new Date(iso)) })}
            testID="trip-end-time"
          />
        </View>
      </View>
      <Text variant="caption" color="textMuted">
        You can edit the date and time up until the trip goes ACTIVE.
      </Text>
    </View>
  );
}
