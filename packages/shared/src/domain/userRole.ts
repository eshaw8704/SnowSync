/**
 * Club-level role (System Map §03). Officers are members with added permissions.
 * Never infer a role from trip participation, or participation from a role.
 */
export const UserRole = {
  MEMBER: 'MEMBER',
  OFFICER: 'OFFICER',
} as const;

/** One of the {@link UserRole} values. */
export type UserRole = (typeof UserRole)[keyof typeof UserRole];