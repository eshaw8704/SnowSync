import { describe, expect, it } from 'vitest';
import {
  emergencyContactSchema,
  loginRequestSchema,
  membershipDecisionRequestSchema,
  redeemClubCodeRequestSchema,
  signupRequestSchema,
} from '../src';

describe('signupRequestSchema', () => {
  it('accepts a Sac State email and normalizes it', () => {
    const parsed = signupRequestSchema.parse({
      displayName: '  Jacob Stevens ',
      email: ' Jacob@CSUS.edu ',
      password: 'Powder-Day-2027',
    });
    expect(parsed).toEqual({
      displayName: 'Jacob Stevens',
      email: 'jacob@csus.edu',
      password: 'Powder-Day-2027',
    });
  });

  it('rejects other domains and short passwords with clear messages', () => {
    const result = signupRequestSchema.safeParse({
      displayName: 'A',
      email: 'a@gmail.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toContain('Use your Sac State email (@csus.edu).');
    expect(messages).toContain('Use at least 12 characters.');
  });
});

describe('other request schemas', () => {
  it('lets any domain sign in', () => {
    expect(
      loginRequestSchema.safeParse({ email: 'officer@example.com', password: 'x' }).success,
    ).toBe(true);
  });

  it('upper-cases club codes and requires 8 characters', () => {
    expect(redeemClubCodeRequestSchema.parse({ code: ' abcd2345 ' })).toEqual({ code: 'ABCD2345' });
    expect(redeemClubCodeRequestSchema.safeParse({ code: 'ABC' }).success).toBe(false);
  });

  it('requires a reason only when rejecting', () => {
    expect(membershipDecisionRequestSchema.safeParse({ decision: 'APPROVE' }).success).toBe(true);
    expect(membershipDecisionRequestSchema.safeParse({ decision: 'REJECT' }).success).toBe(false);
    expect(
      membershipDecisionRequestSchema.safeParse({
        decision: 'REJECT',
        reason: 'Not a current student',
      }).success,
    ).toBe(true);
  });

  it('validates emergency contact phone numbers', () => {
    expect(
      emergencyContactSchema.safeParse({
        name: 'Taylor',
        relationship: 'Sibling',
        phone: '(916) 555-0142',
      }).success,
    ).toBe(true);
    expect(
      emergencyContactSchema.safeParse({
        name: 'Taylor',
        relationship: 'Sibling',
        phone: 'call me',
      }).success,
    ).toBe(false);
  });
});
