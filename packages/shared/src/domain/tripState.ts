/**
 * Global lifecycle of one trip (System Map §05).
 * CREATED → OPEN_FOR_REGISTRATION → CHECK_IN → ACTIVE → EXIT → COMPLETED.
 * CANCELLED is terminal and can be entered before COMPLETED.
 */
export const TripState = {
  CREATED: 'CREATED',
  OPEN_FOR_REGISTRATION: 'OPEN_FOR_REGISTRATION',
  CHECK_IN: 'CHECK_IN',
  ACTIVE: 'ACTIVE',
  EXIT: 'EXIT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

/** One of the {@link TripState} values. */
export type TripState = (typeof TripState)[keyof typeof TripState];
