import { TripState } from './tripState';

// Every allowed trip transition. Created -> Open for registration -> check in -> active -> exit -> completed.

export const ALLOWED_TRANSITIONS: Readonly<Record<TripState, readonly TripState[]>> = {
  CREATED: ['OPEN_FOR_REGISTRATION', 'CANCELLED'],
  OPEN_FOR_REGISTRATION: ['CHECK_IN', 'CANCELLED'],
  CHECK_IN: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['EXIT', 'CANCELLED'],
  EXIT: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// States where the trip never leaves, either completed or cancelled
export const TERMINAL_TRIP_STATES: readonly TripState[] = ['COMPLETED', 'CANCELLED'];

// true when completed or cancelled
export function isTerminal(state: TripState): boolean {
  return TERMINAL_TRIP_STATES.includes(state);
}

// true when from -> to
export function canTransition(from: TripState, to: TripState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

//next state (never cancelled) or null for completed or cancelled
export function nextForwardState(state: TripState): TripState | null {
  return ALLOWED_TRANSITIONS[state].find((next) => next !== TripState.CANCELLED) ?? null;
}

// Officer early triggers
export const OFFICER_OVERRIDE_TRANSITIONS: readonly (readonly [TripState, TripState])[] = [
  [TripState.CREATED, TripState.OPEN_FOR_REGISTRATION],
  [TripState.OPEN_FOR_REGISTRATION, TripState.CHECK_IN],
  [TripState.CHECK_IN, TripState.ACTIVE],
  [TripState.ACTIVE, TripState.EXIT],
];

/** True when `from → to` is one of {@link OFFICER_OVERRIDE_TRANSITIONS}. */
export function isOfficerOverride(from: TripState, to: TripState): boolean {
  return OFFICER_OVERRIDE_TRANSITIONS.some(([a, b]) => a === from && b === to);
}

export interface TripScheduleTimes {
  state: TripState;
  registrationOpensAt: string | Date;
  checkInStartsAt: string | Date;
  sessionStartsAt: string | Date;
  exitStartsAt: string | Date;
}

// due transition
export interface ScheduledTransition {
  from: TripState;
  to: TripState;
  dueAt: Date;
}

// trigger the transition out of each state
const SCHEDULE_FIELD: Partial<Record<TripState, keyof Omit<TripScheduleTimes, 'state'>>> = {
  CREATED: 'registrationOpensAt',
  OPEN_FOR_REGISTRATION: 'checkInStartsAt',
  CHECK_IN: 'sessionStartsAt',
  ACTIVE: 'exitStartsAt',
};

// transition that is due at now or null. Only the next step is returned:
// A trip that is several steps behind moves one step per scheduler.
export function scheduledTransitionFor(
  trip: TripScheduleTimes,
  now: Date,
): ScheduledTransition | null {
  const field = SCHEDULE_FIELD[trip.state];
  const to = nextForwardState(trip.state);
  if (!field || !to) {
    return null;
  }
  const dueAt = new Date(trip[field]);
  return dueAt.getTime() <= now.getTime() ? { from: trip.state, to, dueAt } : null;
}
