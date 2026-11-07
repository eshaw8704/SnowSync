import { findResort } from '@snowsync/shared';
import { View } from 'react-native';
import { DateTimeField } from '../../../components/DateTimeField';
import { Text } from '../../../components/Text';
import { TextField } from '../../../components/TextField';
import { spacing } from '../../../theme';
import type { StepProps } from './stepProps';

/**
 * Step 3 · Registration settings: registration dates,
 * capacity, and cost per member.
 */
export function RegistrationStep({ value, onChange, errors }: StepProps) {
  const timeZone =
    (value.resortName ? findResort(value.resortName)?.timeZone : undefined) ??
    'America/Los_Angeles';

  return (
    <View style={{ gap: spacing.md }}>
      <DateTimeField
        label="Registration opens"
        mode="datetime"
        value={value.registrationOpensAt}
        timeZone={timeZone}
        error={errors.registrationOpensAt}
        onChange={(registrationOpensAt) => onChange({ registrationOpensAt })}
        testID="registration-opens"
      />
      <DateTimeField
        label="Registration deadline"
        mode="datetime"
        value={value.registrationClosesAt}
        timeZone={timeZone}
        error={errors.registrationClosesAt}
        onChange={(registrationClosesAt) => onChange({ registrationClosesAt })}
        testID="registration-closes"
      />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Capacity"
            value={value.capacityText}
            onChangeText={(capacityText) => onChange({ capacityText })}
            error={errors.capacityText}
            keyboardType="number-pad"
            placeholder="24"
            testID="trip-capacity"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Trip cost ($ per member)"
            value={value.costText}
            onChangeText={(costText) => onChange({ costText })}
            error={errors.costText}
            keyboardType="decimal-pad"
            placeholder="45"
            testID="trip-cost"
          />
        </View>
      </View>
      <Text variant="caption" color="textMuted">
        Only approved club members may register. Capacity and cost can be adjusted before
        registration opens.
      </Text>
    </View>
  );
}
