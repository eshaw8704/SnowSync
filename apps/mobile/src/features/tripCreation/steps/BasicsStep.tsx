import { findResort } from '@snowsync/shared';
import { View } from 'react-native';
import { DateTimeField } from '../../../components/DateTimeField';
import { Text } from '../../../components/Text';
import { TextField } from '../../../components/TextField';
import { spacing } from '../../../theme';
import type { StepProps } from './stepProps';

const DEFAULT_TIME_ZONE = 'America/Los_Angeles';

function resortParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/**
 * Converts a resort-local date and time to a UTC instant.
 *
 * For ambiguous fall-back times, chooses the earlier occurrence.
 * For nonexistent spring-forward times, moves forward to the
 * first valid local minute.
 */
function resortLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): string {
  const target = Date.UTC(year, month - 1, day, hour, minute);

  const offsets = new Set<number>();

  // Sample offsets around the requested date to account for
  // daylight saving transitions.
  for (const hours of [-36, -12, 0, 12, 36]) {
    const sample = target + hours * 60 * 60 * 1000;
    const parts = resortParts(new Date(sample), timeZone);

    const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);

    offsets.add(localAsUtc - sample);
  }

  const candidates = [...offsets].map((offset) => target - offset);

  const exactMatches = candidates
    .filter((instant) => {
      const parts = resortParts(new Date(instant), timeZone);

      return (
        parts.year === year &&
        parts.month === month &&
        parts.day === day &&
        parts.hour === hour &&
        parts.minute === minute
      );
    })
    .sort((a, b) => a - b);

  const exactMatch = exactMatches[0];

  if (exactMatch !== undefined) {
    return new Date(exactMatch).toISOString();
  }

  // The requested local time does not exist during spring forward.
  // Find the first valid minute after the gap.
  const validAfter = candidates
    .filter((instant) => {
      const parts = resortParts(new Date(instant), timeZone);

      const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);

      return localAsUtc > target;
    })
    .sort((a, b) => a - b);

  const firstValidAfter = validAfter[0];

  if (firstValidAfter !== undefined) {
    return new Date(firstValidAfter).toISOString();
  }

  throw new Error('The selected resort-local time cannot be resolved.');
}

/** Copies the resort-local calendar day while preserving the existing clock time. */
export function withDay(
  iso: string | null,
  day: Date,
  hour: number,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const selectedDay = resortParts(day, timeZone);
  const existing = iso ? resortParts(new Date(iso), timeZone) : null;

  return resortLocalToUtc(
    selectedDay.year,
    selectedDay.month,
    selectedDay.day,
    existing?.hour ?? hour,
    existing?.minute ?? 0,
    timeZone,
  );
}

/** Copies the resort-local clock time while preserving the existing calendar day. */
export function withTime(iso: string | null, time: Date, timeZone = DEFAULT_TIME_ZONE): string {
  const selectedTime = resortParts(time, timeZone);
  const existing = resortParts(iso ? new Date(iso) : time, timeZone);

  return resortLocalToUtc(
    existing.year,
    existing.month,
    existing.day,
    selectedTime.hour,
    selectedTime.minute,
    timeZone,
  );
}

/** Step 1 · Basics (Figma catalog 09): trip name, description, date, start and end time. */
export function BasicsStep({ value, onChange, errors }: StepProps) {
  const timeZone =
    (value.resortName ? findResort(value.resortName)?.timeZone : undefined) ?? DEFAULT_TIME_ZONE;

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
        timeZone={timeZone}
        error={errors.startsAt && !value.startsAt ? errors.startsAt : undefined}
        onChange={(iso) => {
          const day = new Date(iso);

          onChange({
            startsAt: withDay(value.startsAt, day, 8, timeZone),
            endsAt: withDay(value.endsAt, day, 16, timeZone),
            checkInStartsAt: value.checkInStartsAt
              ? withDay(value.checkInStartsAt, day, 7, timeZone)
              : null,
            sessionStartsAt: value.sessionStartsAt
              ? withDay(value.sessionStartsAt, day, 8, timeZone)
              : null,
            exitStartsAt: value.exitStartsAt
              ? withDay(value.exitStartsAt, day, 16, timeZone)
              : null,
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
            timeZone={timeZone}
            error={value.startsAt ? errors.startsAt : undefined}
            onChange={(iso) =>
              onChange({
                startsAt: withTime(value.startsAt, new Date(iso), timeZone),
              })
            }
            testID="trip-start-time"
          />
        </View>

        <View style={{ flex: 1 }}>
          <DateTimeField
            label="End time"
            mode="time"
            value={value.endsAt}
            timeZone={timeZone}
            error={errors.endsAt}
            onChange={(iso) =>
              onChange({
                endsAt: withTime(value.endsAt, new Date(iso), timeZone),
              })
            }
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
