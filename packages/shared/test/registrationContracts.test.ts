import { describe, expect, it } from 'vitest';
import {
  ChargeStatus,
  MONEY_RECEIVED_STATUSES,
  officerCheckInRequestSchema,
  registerRequestSchema,
  rosterAddRequestSchema,
  rosterRemoveRequestSchema,
  SSO_CODE_TTL_SECONDS,
  ssoExchangeRequestSchema,
} from '../src';

const ID = '7f1c1b8e-2a5d-4c3e-9b1a-0d2e3f4a5b6c';

describe('registration contracts', () => {
  it('requires a uuid opId to register', () => {
    expect(registerRequestSchema.safeParse({ opId: ID }).success).toBe(true);
    expect(registerRequestSchema.safeParse({ opId: 'abc' }).success).toBe(false);
    expect(registerRequestSchema.safeParse({}).success).toBe(false);
  });

  it('defaults allowOverCapacity to false when adding to a roster', () => {
    expect(rosterAddRequestSchema.parse({ userId: ID })).toEqual({
      userId: ID,
      allowOverCapacity: false,
    });
  });

  it('requires a real reason to remove a member', () => {
    expect(rosterRemoveRequestSchema.safeParse({ reason: '  ' }).success).toBe(false);
    expect(rosterRemoveRequestSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
    expect(rosterRemoveRequestSchema.parse({ reason: '  Dropped the class  ' })).toEqual({
      reason: 'Dropped the class',
    });
  });

  it('requires a member, a reason and an opId for an officer check-in', () => {
    expect(
      officerCheckInRequestSchema.safeParse({ userId: ID, reason: 'At the bus', opId: ID }).success,
    ).toBe(true);
    expect(officerCheckInRequestSchema.safeParse({ userId: ID, opId: ID }).success).toBe(false);
  });

  it('treats paid and refund statuses as money received, never unpaid or void', () => {
    expect(MONEY_RECEIVED_STATUSES).toContain(ChargeStatus.PAID);
    expect(MONEY_RECEIVED_STATUSES).toContain(ChargeStatus.REFUND_REVIEW);
    expect(MONEY_RECEIVED_STATUSES).not.toContain(ChargeStatus.UNPAID);
    expect(MONEY_RECEIVED_STATUSES).not.toContain(ChargeStatus.VOID);
  });

  it('keeps SSO codes short-lived and rejects short codes', () => {
    expect(SSO_CODE_TTL_SECONDS).toBe(60);
    expect(ssoExchangeRequestSchema.safeParse({ code: 'short' }).success).toBe(false);
    expect(ssoExchangeRequestSchema.safeParse({ code: 'a'.repeat(43) }).success).toBe(true);
  });
});
