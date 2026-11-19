export const ChargeKind = {
  TRIP: 'TRIP',
  DUES: 'DUES',
} as const;

export type ChargeKind = (typeof ChargeKind)[keyof typeof ChargeKind];

/**
 * Where one charge is in its life. Registration and payment are independent:
 * REGISTERED + UNPAID is a normal state. Only Stripe's signed webhook moves a charge to PAID
 * (Sprint 8); Sprint 4 only creates UNPAID charges and voids or reviews them on cancellation.
 */
export const ChargeStatus = {
  UNPAID: 'UNPAID',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  OVERDUE: 'OVERDUE',
  VOID: 'VOID',
  REFUND_REVIEW: 'REFUND_REVIEW',
  REFUNDED: 'REFUNDED',
  NOT_REFUNDED: 'NOT_REFUNDED',
} as const;

export type ChargeStatus = (typeof ChargeStatus)[keyof typeof ChargeStatus];

/** Charge statuses that mean money was received (paid, or paid and now being reviewed). */
export const MONEY_RECEIVED_STATUSES: readonly ChargeStatus[] = [
  ChargeStatus.PAID,
  ChargeStatus.REFUND_REVIEW,
  ChargeStatus.REFUNDED,
  ChargeStatus.NOT_REFUNDED,
];
