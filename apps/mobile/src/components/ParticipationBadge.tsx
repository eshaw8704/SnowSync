import type { ParticipationState } from '@snowsync/shared';
import { View } from 'react-native';
import { spacing } from '../theme';
import { StatusBadge, type BadgeTone, type StatusBadgeProps } from './StatusBadge';

/** What each participation state is called (SS-127). */
export const PARTICIPATION_LABELS: Record<ParticipationState, string> = {
  NOT_REGISTERED: 'Not registered',
  REGISTERED: 'Registered',
  CHECKED_IN: 'Checked in',
  ACTIVE: 'Active',
  CHECKED_OUT: 'Checked out',
  NO_SHOW: 'No-show',
  LEFT_EARLY: 'Left early',
};

const STYLE: Record<ParticipationState, { tone: BadgeTone; icon: StatusBadgeProps['icon'] }> = {
  NOT_REGISTERED: { tone: 'neutral', icon: 'account-outline' },
  REGISTERED: { tone: 'blue', icon: 'ticket-confirmation-outline' },
  CHECKED_IN: { tone: 'blue', icon: 'map-marker-check' },
  ACTIVE: { tone: 'green', icon: 'run' },
  CHECKED_OUT: { tone: 'neutral', icon: 'logout' },
  NO_SHOW: { tone: 'red', icon: 'account-cancel-outline' },
  LEFT_EARLY: { tone: 'neutral', icon: 'exit-run' },
};

/** Props for {@link ParticipationBadge}. */
export interface ParticipationBadgeProps {
  participation: ParticipationState;
  /** Adds the amber "Late arrival" annotation (never red; it is not an emergency). */
  late?: boolean;
  showPrefix?: boolean;
  testID?: string;
}

/** The signed-in member's own status on one trip, separate from the trip's phase. */
export function ParticipationBadge({
  participation,
  late = false,
  showPrefix = true,
  testID,
}: ParticipationBadgeProps) {
  const badge = (
    <StatusBadge
      label={PARTICIPATION_LABELS[participation]}
      prefix={showPrefix ? 'YOU' : undefined}
      testID={testID}
      {...STYLE[participation]}
    />
  );
  if (!late) {
    return badge;
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {badge}
      <StatusBadge label="Late arrival" tone="amber" icon="clock-alert-outline" />
    </View>
  );
}
