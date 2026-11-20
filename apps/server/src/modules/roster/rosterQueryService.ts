import type { ChargeStatus, RosterEntry, RosterResponse, RosterSummary } from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/httpError';

//Charge statuses that count as "Unpaid" on the roster
const UNPAID: ChargeStatus[] = ['UNPAID', 'OVERDUE', 'FAILED'];

const entrySelect = {
  participation: true,
  checkedInAt: true,
  checkInMethod: true,
  lateMinutes: true,
  checkedInBy: { select: { displayName: true } },
  user: { select: { id: true, displayName: true, email: true, role: true } },
} satisfies Prisma.TripMembershipSelect;

type MembershipRow = Prisma.TripMembershipGetPayload<{ select: typeof entrySelect }>;
type ChargeRow = { userId: string; status: ChargeStatus; amountCents: number };

function toEntry(row: MembershipRow, charge: ChargeRow | undefined): RosterEntry {
  return {
    userId: row.user.id,
    displayName: row.user.displayName,
    email: row.user.email,
    role: row.user.role,
    participation: row.participation,
    checkedInAt: row.checkedInAt?.toISOString() ?? null,
    checkInMethod: row.checkInMethod,
    checkedInByName: row.checkedInBy?.displayName ?? null,
    lateMinutes: row.lateMinutes,
    chargeStatus: charge?.status ?? null,
    chargeAmountCents: charge?.amountCents ?? null,
  };
}

//Each member's latest trip charge for this trip, by user id
async function latestCharges(
  client: Prisma.TransactionClient,
  tripId: string,
  userIds?: string[],
): Promise<Map<string, ChargeRow>> {
  const charges = await client.charge.findMany({
    where: { tripId, kind: 'TRIP', ...(userIds ? { userId: { in: userIds } } : {}) },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { userId: true, status: true, amountCents: true },
  });
  // Later rows overwrite earlier ones, so each user keeps their newest charge.
  return new Map(charges.map((charge) => [charge.userId, charge]));
}

//Counts at the top of the roster
export function summarize(capacity: number, entries: RosterEntry[]): RosterSummary {
  const count = (test: (entry: RosterEntry) => boolean) => entries.filter(test).length;
  return {
    capacity,
    registered: count((e) => ['REGISTERED', 'CHECKED_IN', 'ACTIVE'].includes(e.participation)),
    checkedIn: count((e) => e.participation === 'CHECKED_IN'),
    active: count((e) => e.participation === 'ACTIVE'),
    notArrived: count((e) => e.participation === 'REGISTERED'),
    late: count((e) => (e.lateMinutes ?? 0) > 0),
    unpaid: count((e) => e.chargeStatus !== null && UNPAID.includes(e.chargeStatus)),
  };
}

//GET /admin/trips/:tripId/roster (SS-80): everyone with a spot or an attendance record, with participation, check-in and payment as separate fields. Members who cancelled are left out.
//Never includes member locations (officers see attendance status, not GPS)
export async function getRoster(tripId: string): Promise<RosterResponse> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      name: true,
      state: true,
      resortName: true,
      resortTimeZone: true,
      startsAt: true,
      sessionStartsAt: true,
      capacity: true,
    },
  });
  if (!trip) {
    throw new HttpError('NOT_FOUND', "We can't find this trip.");
  }
  const [rows, charges] = await Promise.all([
    prisma.tripMembership.findMany({
      where: { tripId, participation: { not: 'NOT_REGISTERED' } },
      select: entrySelect,
      orderBy: { user: { displayName: 'asc' } },
    }),
    latestCharges(prisma, tripId),
  ]);
  const entries = rows.map((row) => toEntry(row, charges.get(row.user.id)));
  return {
    trip: {
      ...trip,
      startsAt: trip.startsAt.toISOString(),
      sessionStartsAt: trip.sessionStartsAt.toISOString(),
    },
    summary: summarize(trip.capacity, entries),
    entries,
  };
}

/** One member's roster row, or null when they have no membership on the trip. */
export async function loadRosterEntry(
  client: Prisma.TransactionClient,
  tripId: string,
  userId: string,
): Promise<RosterEntry | null> {
  const row = await client.tripMembership.findUnique({
    where: { tripId_userId: { tripId, userId } },
    select: entrySelect,
  });
  if (!row) {
    return null;
  }
  const charges = await latestCharges(client, tripId, [userId]);
  return toEntry(row, charges.get(userId));
}
