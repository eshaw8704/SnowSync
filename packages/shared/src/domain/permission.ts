import type { ConfigurableRole } from './userRole';

/**
 * Administrative permissions (System Map §03 "Who can do what", officer rows).
 * Executives always hold all of them. For MEMBER and OFFICER, executives switch each one on or off.
 * `enforcedFrom` is the sprint whose feature checks the permission on the server.
 */

export const PERMISSIONS = {
  REVIEW_MEMBERSHIPS: {
    label: 'Review membership requests',
    description: 'Approve or reject people waiting to join the club.',
    enforcedFrom: 2,
  },
  CREATE_CLUB_CODES: {
    label: 'Create club codes',
    description: 'Generate one-time codes that verify a new member instantly.',
    enforcedFrom: 2,
  },
  MANAGE_TRIPS: {
    label: 'Manage trips',
    description: 'Create, edit, schedule, override and cancel trips.',
    enforcedFrom: 3,
  },
  MANAGE_ROSTER: {
    label: 'Manage trip rosters',
    description: 'Add or remove members, check people in, record no-shows and early departures.',
    enforcedFrom: 4,
  },
  MONITOR_TRIPS: {
    label: 'Monitor live trips',
    description: 'See every position, alert and attendance change during an active trip.',
    enforcedFrom: 6,
  },
  VIEW_EMERGENCY_CONTACTS: {
    label: 'View emergency contacts',
    description: "Read a member's emergency contact for trip safety.",
    enforcedFrom: 6,
  },
  SEND_ANNOUNCEMENTS: {
    label: 'Send announcements',
    description: 'Message the whole club or one trip.',
    enforcedFrom: 8,
  },
  MANAGE_PAYMENTS: {
    label: 'Manage payments',
    description: 'Set dues, see who owes what and send payment reminders.',
    enforcedFrom: 8,
  },
  VIEW_REPORTS: {
    label: 'View club reports',
    description: 'See attendance and dues-completion statistics.',
    enforcedFrom: 8,
  },
  REVIEW_REFUNDS: {
    label: 'Review refunds',
    description: 'Decide refund requests after a trip is cancelled.',
    enforcedFrom: 9,
  },
  MANAGE_MEMBERS: {
    label: 'Manage members',
    description: 'Open the member directory and deactivate accounts.',
    enforcedFrom: 9,
  },
} as const satisfies Record<string, { label: string; description: string; enforcedFrom: number }>;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export type PermissionMap = Record<Permission, boolean>;

export function permissionMap(value: boolean): PermissionMap {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, value])) as PermissionMap;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<ConfigurableRole, PermissionMap> = {
  MEMBER: permissionMap(false),
  OFFICER: { ...permissionMap(true), REVIEW_REFUNDS: false },
};

export const LOCKED_ROLE_PERMISSIONS: Record<ConfigurableRole, readonly Permission[]> = {
  MEMBER: [],
  OFFICER: ['MONITOR_TRIPS'],
};

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && value in PERMISSIONS;
}
