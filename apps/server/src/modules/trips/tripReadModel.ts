import type { ParticipationState, TripDetail, TripOfficer, TripSummary } from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';

/** Participations that hold a spot on the trip (everything except NOT_REGISTERED). */
const HOLDS_A_SPOT: ParticipationState[] = [
  'REGISTERED',
  'CHECKED_IN',
  'ACTIVE',
  'CHECKED_OUT',
  'NO_SHOW',
  'LEFT_EARLY',
];

/** What every trip query loads: the counts and the viewer's own membership. */
function summaryInclude(viewerId: string) {
  return {
    memberships: { where: { userId: viewerId }, select: { participation: true } },
    _count: { select: { memberships: { where: { participation: { in: HOLDS_A_SPOT } } } } },
  } satisfies Prisma.TripInclude;
}

type TripWithSummary = Prisma.TripGetPayload<{ include: ReturnType<typeof summaryInclude> }>;

function toSummary(trip: TripWithSummary): TripSummary {
  return {
    id: trip.id,
    name: trip.name,
    resortName: trip.resortName,
    resortTimeZone: trip.resortTimeZone,
    startsAt: trip.startsAt.toISOString(),
    endsAt: trip.endsAt.toISOString(),
    state: trip.state,
    capacity: trip.capacity,
    registeredCount: trip._count.memberships,
    costCents: trip.costCents,
    myParticipation: trip.memberships[0]?.participation ?? 'NOT_REGISTERED',
  };
}

/**
 * Trip summaries for `viewerId`, as GET /trips returns them. Callers decide visibility with
 * `where` (for example, members never see CREATED trips) and the sort order.
 */
export async function loadTripSummaries(
  viewerId: string,
  where: Prisma.TripWhereInput,
  orderBy: Prisma.TripOrderByWithRelationInput = { startsAt: 'asc' },
): Promise<TripSummary[]> {
  const trips = await prisma.trip.findMany({ where, orderBy, include: summaryInclude(viewerId) });
  return trips.map(toSummary);
}

/**
 * The full trip as GET /trips/:id, POST /trips and PATCH /trips/:id return it, or null when there
 * is no such trip. Visibility is the caller's job. Pass `tx` to read inside a transaction.
 */
export async function loadTripDetail(
  tripId: string,
  viewerId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<TripDetail | null> {
  const trip = await tx.trip.findUnique({
    where: { id: tripId },
    include: {
      ...summaryInclude(viewerId),
      geofence: true,
      createdBy: { select: { id: true, displayName: true, role: true } },
    },
  });
  if (!trip) {
    return null;
  }
  const rosterOfficers = await tx.tripMembership.findMany({
    where: { tripId, participation: { in: HOLDS_A_SPOT }, user: { role: { not: 'MEMBER' } } },
    select: { user: { select: { id: true, displayName: true, role: true } } },
    orderBy: { registeredAt: 'asc' },
  });
  const officers: TripOfficer[] = [trip.createdBy];
  for (const { user } of rosterOfficers) {
    if (!officers.some((officer) => officer.id === user.id)) {
      officers.push(user);
    }
  }
  return {
    ...toSummary(trip),
    description: trip.description,
    version: trip.version,
    registrationOpensAt: trip.registrationOpensAt.toISOString(),
    registrationClosesAt: trip.registrationClosesAt.toISOString(),
    checkInStartsAt: trip.checkInStartsAt.toISOString(),
    sessionStartsAt: trip.sessionStartsAt.toISOString(),
    exitStartsAt: trip.exitStartsAt.toISOString(),
    geofence: {
      latitude: trip.geofence?.latitude ?? 0,
      longitude: trip.geofence?.longitude ?? 0,
      radiusMeters: trip.geofence?.radiusMeters ?? 0,
      label: trip.geofence?.label ?? '',
    },
    officers,
  };
}
