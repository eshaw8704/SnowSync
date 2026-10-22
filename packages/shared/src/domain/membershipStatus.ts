/**
 * Club membership of one account (System Map §02). An account is not a membership:
 * new accounts start PENDING_APPROVAL and only APPROVED unlocks club features.
 */
export const MembershipStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

export type MembershipStatus = (typeof MembershipStatus)[keyof typeof MembershipStatus];
