import { describe, expect, it } from 'vitest';
import {
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  EXECUTIVE_ROLES,
  LOCKED_ROLE_PERMISSIONS,
  MembershipStatus,
  PERMISSION_KEYS,
  ROLE_RANK,
  isConfigurableRole,
  isExecutiveRole,
  isPermission,
  outranks,
  updateRolePermissionsRequestSchema,
} from '../src';

describe('roles', () => {
  it('ranks Member < Officer < Treasurer < Vice President < President', () => {
    expect(ROLE_RANK).toEqual({
      MEMBER: 0,
      OFFICER: 1,
      TREASURER: 2,
      VICE_PRESIDENT: 3,
      PRESIDENT: 4,
    });
    expect(outranks('PRESIDENT', 'VICE_PRESIDENT')).toBe(true);
    expect(outranks('OFFICER', 'OFFICER')).toBe(false);
  });

  it('separates executive roles from configurable roles', () => {
    expect(EXECUTIVE_ROLES).toEqual(['TREASURER', 'VICE_PRESIDENT', 'PRESIDENT']);
    expect(CONFIGURABLE_ROLES).toEqual(['MEMBER', 'OFFICER']);
    expect(isExecutiveRole('TREASURER')).toBe(true);
    expect(isExecutiveRole('OFFICER')).toBe(false);
    expect(isConfigurableRole('OFFICER')).toBe(true);
    expect(isConfigurableRole('PRESIDENT')).toBe(false);
  });

  it('lists the membership statuses from the System Map', () => {
    expect(Object.values(MembershipStatus)).toEqual([
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'NOT_AUTHORIZED',
      'DEACTIVATED',
    ]);
  });
});

describe('permissions', () => {
  it('has the agreed catalog in order', () => {
    expect(PERMISSION_KEYS).toEqual([
      'REVIEW_MEMBERSHIPS',
      'CREATE_CLUB_CODES',
      'MANAGE_TRIPS',
      'MANAGE_ROSTER',
      'MONITOR_TRIPS',
      'VIEW_EMERGENCY_CONTACTS',
      'SEND_ANNOUNCEMENTS',
      'MANAGE_PAYMENTS',
      'VIEW_REPORTS',
      'REVIEW_REFUNDS',
      'MANAGE_MEMBERS',
    ]);
    expect(isPermission('MANAGE_TRIPS')).toBe(true);
    expect(isPermission('FLY')).toBe(false);
  });

  it('defaults members to nothing and officers to everything except refunds', () => {
    expect(Object.values(DEFAULT_ROLE_PERMISSIONS.MEMBER).every((v) => !v)).toBe(true);
    const officer = DEFAULT_ROLE_PERMISSIONS.OFFICER;
    expect(officer.REVIEW_REFUNDS).toBe(false);
    expect(PERMISSION_KEYS.filter((key) => !officer[key])).toEqual(['REVIEW_REFUNDS']);
  });

  it('locks live trip monitoring on for officers', () => {
    expect(LOCKED_ROLE_PERMISSIONS).toEqual({ MEMBER: [], OFFICER: ['MONITOR_TRIPS'] });
  });

  it('requires every permission and a reason when updating a role', () => {
    const permissions = { ...DEFAULT_ROLE_PERMISSIONS.MEMBER, REVIEW_MEMBERSHIPS: true };
    expect(
      updateRolePermissionsRequestSchema.safeParse({
        role: 'MEMBER',
        permissions,
        reason: 'Trip leads',
      }).success,
    ).toBe(true);
    const missingOne: Partial<typeof permissions> = { ...permissions };
    delete missingOne.MANAGE_MEMBERS;
    expect(
      updateRolePermissionsRequestSchema.safeParse({
        role: 'MEMBER',
        permissions: missingOne,
        reason: 'x y z',
      }).success,
    ).toBe(false);
    expect(
      updateRolePermissionsRequestSchema.safeParse({
        role: 'PRESIDENT',
        permissions,
        reason: 'Nope',
      }).success,
    ).toBe(false);
    expect(
      updateRolePermissionsRequestSchema.safeParse({ role: 'OFFICER', permissions, reason: '' })
        .success,
    ).toBe(false);
  });
});
