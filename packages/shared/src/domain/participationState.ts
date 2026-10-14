/**
 * One member's participation in one trip (System Map §06, §07, §18).
 * Independent of the trip's own {@link TripState}.
 */
export const ParticipationState = {
  NOT_REGISTERED: 'NOT_REGISTERED',
  REGISTERED: 'REGISTERED',
  CHECKED_IN: 'CHECKED_IN',
  ACTIVE: 'ACTIVE',
  CHECKED_OUT: 'CHECKED_OUT',
  NO_SHOW: 'NO_SHOW',
  LEFT_EARLY: 'LEFT_EARLY',
} as const;

/** One of the {@link ParticipationState} values. */
export type ParticipationState = (typeof ParticipationState)[keyof typeof ParticipationState];
