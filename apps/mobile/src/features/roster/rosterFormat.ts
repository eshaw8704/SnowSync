import type { RosterEntry } from '@snowsync/shared';
import { formatCost, formatTime } from '../trips/tripFormat';

/** The roster's filter chips (Figma catalog 22 page 71). */
export const ROSTER_FILTERS = ['All', 'Active', 'Unpaid', 'Officers'] as const;
export type RosterFilter = (typeof ROSTER_FILTERS)[number];

const UNPAID = ['UNPAID', 'OVERDUE', 'FAILED'];

/** True when the entry still owes money for this trip. */
export function isUnpaid(entry: RosterEntry): boolean {
  return entry.chargeStatus !== null && UNPAID.includes(entry.chargeStatus);
}

/** Entries the chip shows. "Active" means on site: checked in or active. */
export function filterRoster(entries: RosterEntry[], filter: RosterFilter): RosterEntry[] {
  switch (filter) {
    case 'Active':
      return entries.filter(
        (e) => e.participation === 'CHECKED_IN' || e.participation === 'ACTIVE',
      );
    case 'Unpaid':
      return entries.filter(isUnpaid);
    case 'Officers':
      return entries.filter((e) => e.role !== 'MEMBER');
    case 'All':
      return entries;
  }
}

/** "MB" for "Maya Brooks"; one letter for a one-word name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')
  ).toUpperCase();
}

/** Payment badge text: Paid, Unpaid, Awaiting (processing), or null when there is no charge. */
export function paymentLabel(entry: RosterEntry): string | null {
  switch (entry.chargeStatus) {
    case 'PAID':
      return 'Paid';
    case 'PROCESSING':
      return 'Awaiting';
    case 'UNPAID':
    case 'OVERDUE':
    case 'FAILED':
      return 'Unpaid';
    case 'REFUND_REVIEW':
      return 'Refund review';
    default:
      return null;
  }
}

/**
 * The second line of a roster row, e.g. "ACTIVE · checked in 8:14 AM",
 * "CHECKED IN · late 9:18 AM · $45 due" or "REGISTERED · not arrived · paid $45".
 */
export function statusLine(entry: RosterEntry, timeZone: string): string {
  const parts: string[] = [entry.participation.replace('_', ' ')];
  if (entry.checkedInAt) {
    const time = formatTime(entry.checkedInAt, timeZone);
    parts.push(entry.lateMinutes ? `late ${time}` : `checked in ${time}`);
  } else if (entry.participation === 'REGISTERED') {
    parts.push('not arrived');
  }
  if (entry.chargeAmountCents !== null) {
    if (isUnpaid(entry)) parts.push(`${formatCost(entry.chargeAmountCents)} due`);
    else if (entry.chargeStatus === 'PAID')
      parts.push(`paid ${formatCost(entry.chargeAmountCents)}`);
  }
  return parts.join(' · ');
}
