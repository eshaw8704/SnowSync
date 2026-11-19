import { ParticipationState } from './participationState';

export const ALLOWED_PARTICIPATION_CHANGES: Readonly<
  Record<ParticipationState, readonly ParticipationState[]>
> = {
  NOT_REGISTERED: ['REGISTERED'],
  REGISTERED: ['NOT_REGISTERED', 'CHECKED_IN', 'NO_SHOW'],
  CHECKED_IN: ['ACTIVE', 'CHECKED_OUT', 'LEFT_EARLY'],
  ACTIVE: ['CHECKED_OUT', 'LEFT_EARLY'],
  CHECKED_OUT: [],
  NO_SHOW: [],
  LEFT_EARLY: [],
};

/** True when one member's participation may move from `from` to `to`. */
export function canChangeParticipation(from: ParticipationState, to: ParticipationState): boolean {
  return ALLOWED_PARTICIPATION_CHANGES[from].includes(to);
}

/** States that hold a spot on the trip: everything from REGISTERED until the member leaves. */
export const SPOT_HOLDING_STATES: readonly ParticipationState[] = [
  ParticipationState.REGISTERED,
  ParticipationState.CHECKED_IN,
  ParticipationState.ACTIVE,
];

/** True when the member holds one of the trip's capacity spots. */
export function holdsSpot(state: ParticipationState): boolean {
  return SPOT_HOLDING_STATES.includes(state);
}

export const ATTENDANCE_STATES: readonly ParticipationState[] = [
  ParticipationState.CHECKED_IN,
  ParticipationState.ACTIVE,
];
