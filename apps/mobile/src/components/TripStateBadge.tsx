import type { TripState } from '@snowsync/shared';
import { StatusBadge, type BadgeTone, type StatusBadgeProps } from './StatusBadge';

/** What members and officers call each trip phase (SS-127). */
export const TRIP_STATE_LABELS: Record<TripState, string> = {
  CREATED: 'Created',
  OPEN_FOR_REGISTRATION: 'Registration open',
  CHECK_IN: 'Check-in',
  ACTIVE: 'Active',
  EXIT: 'Ending',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STYLE: Record<TripState, { tone: BadgeTone; icon: StatusBadgeProps['icon'] }> = {
  CREATED: { tone: 'neutral', icon: 'pencil-outline' },
  OPEN_FOR_REGISTRATION: { tone: 'green', icon: 'door-open' },
  CHECK_IN: { tone: 'blue', icon: 'map-marker-check-outline' },
  ACTIVE: { tone: 'green', icon: 'play-circle-outline' },
  EXIT: { tone: 'blue', icon: 'flag-checkered' },
  COMPLETED: { tone: 'neutral', icon: 'check-circle-outline' },
  CANCELLED: { tone: 'red', icon: 'close-circle-outline' },
};

/** Props for {@link TripStateBadge}. */
export interface TripStateBadgeProps {
  state: TripState;
  /** Hide the "TRIP" prefix where the context already says it. */
  showPrefix?: boolean;
  testID?: string;
}

/** The trip's lifecycle phase. Always shown separately from the member's ParticipationBadge. */
export function TripStateBadge({ state, showPrefix = true, testID }: TripStateBadgeProps) {
  return (
    <StatusBadge
      label={TRIP_STATE_LABELS[state]}
      prefix={showPrefix ? 'TRIP' : undefined}
      testID={testID}
      {...STYLE[state]}
    />
  );
}
