import { z } from 'zod';
import type { MembershipStatus } from '../domain/membershipStatus';

export const redeemClubCodeRequestSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8}$/, { message: 'Club codes are 8 letters and numbers.' }),
});
export type RedeemClubCodeRequest = z.infer<typeof redeemClubCodeRequestSchema>;

/** GET /membership/status and the response of POST /membership/code */
export interface MembershipStatusResponse {
  status: MembershipStatus;
  requestedAt: string;
  rejectionReason: string | null;
}

export const ClubCodeErrorReason = {
  CODE_INVALID: 'CODE_INVALID',
  CODE_USED: 'CODE_USED',
  CODE_EXPIRED: 'CODE_EXPIRED',
  ALREADY_APPROVED: 'ALREADY_APPROVED',
} as const;
export type ClubCodeErrorReason = (typeof ClubCodeErrorReason)[keyof typeof ClubCodeErrorReason];

export interface PendingMembershipItem {
  userId: string;
  displayName: string;
  email: string;
  requestedAt: string;
}

export const membershipDecisionRequestSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('APPROVE') }),
  z.object({
    decision: z.literal('REJECT'),
    reason: z
      .string()
      .trim()
      .min(3, { message: 'Give a reason the requester will see.' })
      .max(500, { message: 'Use 500 characters or fewer.' }),
  }),
]);
export type MembershipDecisionRequest = z.infer<typeof membershipDecisionRequestSchema>;

export interface ClubCodeResponse {
  code: string;
  expiresAt: string;
}

export const CLUB_CODE_TTL_DAYS = 7;
