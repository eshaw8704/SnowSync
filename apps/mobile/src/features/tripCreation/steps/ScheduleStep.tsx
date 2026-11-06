import { View } from 'react-native';
import { Card } from '../../../components/Card';
import { DateTimeField, formatFieldValue } from '../../../components/DateTimeField';
import { Text } from '../../../components/Text';
import { spacing } from '../../../theme';
import type { StepProps } from './stepProps';

/**
 * Step 4 · Lifecycle schedule (Figma catalog 09): when check-in starts, when the active session
 * starts and when ending begins. "Open registration" was set on step 3 and is shown here so the
 * whole timeline reads top to bottom. The Scheduler (SS-141) moves the trip at these times.
 */
export function ScheduleStep({ value, onChange, errors }: StepProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="label">Open registration</Text>
        <Text>
          {value.registrationOpensAt
            ? formatFieldValue(value.registrationOpensAt, 'datetime')
            : 'Set on Registration settings'}
        </Text>
      </View>
      <DateTimeField
        label="Start check-in"
        mode="datetime"
        value={value.checkInStartsAt}
        error={errors.checkInStartsAt}
        onChange={(checkInStartsAt) => onChange({ checkInStartsAt })}
        testID="schedule-check-in"
      />
      <DateTimeField
        label="Start active session"
        mode="datetime"
        value={value.sessionStartsAt}
        error={errors.sessionStartsAt}
        onChange={(sessionStartsAt) => onChange({ sessionStartsAt })}
        testID="schedule-session"
      />
      <DateTimeField
        label="Begin ending"
        mode="datetime"
        value={value.exitStartsAt}
        error={errors.exitStartsAt}
        onChange={(exitStartsAt) => onChange({ exitStartsAt })}
        testID="schedule-exit"
      />
      <Card>
        <Text variant="caption" color="textMuted">
          The trip is ACTIVE from the scheduled start time until the scheduled end time. Officers
          may manually override a transition when conditions on the ground require it.
        </Text>
      </Card>
    </View>
  );
}
