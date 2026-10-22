/**
 * Club-level role (System Map §03). Officers are members with added permissions.
 * Officers are members with added permissions. Treasurer, Vice President, Present are the executive roles: they always hold every permission
 * Never infer a role from trip participation, or participation from a role.
 */
export const UserRole = {
  MEMBER: 'MEMBER',
  OFFICER: 'OFFICER',
  TREASURER: 'TREASURER',
  VICE_PRESIDENT: 'VICE_PRESIDENT',
  PRESIDENT: 'PRESIDENT',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLES: readonly UserRole[] = Object.values(UserRole);

export const ROLE_RANK: Record<UserRole, number> = {
  MEMBER: 0,
  OFFICER: 1,
  TREASURER: 2,
  VICE_PRESIDENT: 3,
  PRESIDENT: 4,
};

export const EXECUTIVE_ROLES = ['TREASURER', 'VICE_PRESIDENT', 'PRESIDENT'] as const;
export type ExecutiveRole = (typeof EXECUTIVE_ROLES)[number];
export const CONFIGURABLE_ROLES = ['MEMBER', 'OFFICER'] as const;
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  MEMBER: 'Member',
  OFFICER: 'Officer',
  TREASURER: 'Treasurer',
  VICE_PRESIDENT: 'Vice President',
  PRESIDENT: 'President',
};

export function isExecutiveRole(role: UserRole): role is ExecutiveRole {
  return (EXECUTIVE_ROLES as readonly string[]).includes(role);
}

export function isConfigurableRole(role: UserRole): role is ConfigurableRole {
  return (CONFIGURABLE_ROLES as readonly string[]).includes(role);
}

export function outranks(role: UserRole, other: UserRole): boolean {
  return ROLE_RANK[role] > ROLE_RANK[other];
}
