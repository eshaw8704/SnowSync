/**
 * Formatting for trip dates, times, money and spots. Trip times are UTC instants; they are always
 * shown in the resort's time zone (America/Los_Angeles for every club resort), not the phone's.
 */

/** Newer ICU versions put a narrow no-break space before AM/PM; screens and tests expect a plain space. */
function clean(text: string): string {
  return text.replace(/[  ]/g, ' ');
}

function format(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return clean(new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(new Date(iso)));
}

/** "Sat, Feb 6" */
export function formatTripDate(iso: string, timeZone: string): string {
  return format(iso, timeZone, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "Sat, Feb 6, 2027" */
export function formatTripDateWithYear(iso: string, timeZone: string): string {
  return format(iso, timeZone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "8:00 AM" */
export function formatTime(iso: string, timeZone: string): string {
  return format(iso, timeZone, { hour: 'numeric', minute: '2-digit' });
}

/** "8:00 AM–4:00 PM" */
export function formatTimeRange(startIso: string, endIso: string, timeZone: string): string {
  return `${formatTime(startIso, timeZone)}–${formatTime(endIso, timeZone)}`;
}

/** "Jan 18, 9:00 AM" */
export function formatDateTime(iso: string, timeZone: string): string {
  return format(iso, timeZone, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "$45", "$45.50", or "Free" for 0. */
export function formatCost(cents: number): string {
  if (cents === 0) return 'Free';
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** "8 spots left", "1 spot left" or "Full". */
export function spotsLeftText(capacity: number, registeredCount: number): string {
  const left = Math.max(0, capacity - registeredCount);
  if (left === 0) return 'Full';
  return `${left} ${left === 1 ? 'spot' : 'spots'} left`;
}

/** Whole days from `now` until `iso`, rounded up (4 hours away is 1); 0 once it has passed. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - now.getTime()) / (24 * 60 * 60 * 1000)));
}
