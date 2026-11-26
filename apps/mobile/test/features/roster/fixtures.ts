import type { RosterEntry, RosterResponse } from '@snowsync/shared';

const base: Omit<RosterEntry, 'userId' | 'displayName' | 'email'> = {
  role: 'MEMBER',
  participation: 'REGISTERED',
  checkedInAt: null,
  checkInMethod: null,
  checkedInByName: null,
  lateMinutes: null,
  chargeStatus: 'PAID',
  chargeAmountCents: 4500,
};

/** Maya: officer, checked in on time. */
export const MAYA: RosterEntry = {
  ...base,
  userId: 'u-maya',
  displayName: 'Maya Lee',
  email: 'maya@csus.edu',
  role: 'OFFICER',
  participation: 'CHECKED_IN',
  checkedInAt: '2027-01-18T16:14:00.000Z',
  checkInMethod: 'OFFICER',
  checkedInByName: 'Ethan Reed',
};

/** Pankaj: registered, unpaid, not arrived. */
export const PANKAJ: RosterEntry = {
  ...base,
  userId: 'u-pankaj',
  displayName: 'Pankaj Kaul',
  email: 'pankaj@csus.edu',
  chargeStatus: 'UNPAID',
};

/** Riley: checked in late, paid. */
export const RILEY: RosterEntry = {
  ...base,
  userId: 'u-riley',
  displayName: 'Riley Patel',
  email: 'riley@csus.edu',
  participation: 'CHECKED_IN',
  checkedInAt: '2027-01-18T17:18:00.000Z',
  checkInMethod: 'OFFICER',
  lateMinutes: 78,
};

/** The Palisades roster (Figma catalog 22 page 71), in check-in. */
export const PALISADES_ROSTER: RosterResponse = {
  trip: {
    id: 'trip-palisades',
    name: 'Palisades Tahoe club day',
    state: 'CHECK_IN',
    resortName: 'Palisades Tahoe',
    resortTimeZone: 'America/Los_Angeles',
    startsAt: '2027-01-18T16:00:00.000Z',
    sessionStartsAt: '2027-01-18T16:00:00.000Z',
    capacity: 26,
  },
  summary: {
    capacity: 26,
    registered: 3,
    checkedIn: 2,
    active: 0,
    notArrived: 1,
    late: 1,
    unpaid: 1,
  },
  entries: [MAYA, PANKAJ, RILEY],
};
