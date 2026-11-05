import { findResort, type CreateTripRequest, type TripDetail } from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { recordAudit } from '../../lib/auditLog';
import { HttpError } from '../../lib/httpError';
import { loadTripDetail } from './tripReadModel';

/**
 * Creates a trip as CREATED with its geofence and initial roster in ONE transaction (SS-37): if any
 * part fails, nothing is saved. Roster members must be approved club members and are added as
 * REGISTERED. Nothing is visible to members until registration opens.
 */
export async function createTrip(actorId: string, input: CreateTripRequest): Promise<TripDetail> {
  const resort = findResort(input.resortName);
  if (!resort) {
    throw new HttpError('VALIDATION_FAILED', 'Choose a resort from the list.');
  }

  const rosterIds = input.rosterUserIds;
  if (rosterIds.length > 0) {
    const approved = await prisma.user.findMany({
      where: { id: { in: rosterIds }, membershipStatus: 'APPROVED' },
      select: { id: true },
    });
    const approvedIds = new Set(approved.map((user) => user.id));
    const notApproved = rosterIds.filter((id) => !approvedIds.has(id));
    if (notApproved.length > 0) {
      throw new HttpError(
        'VALIDATION_FAILED',
        'Only approved club members can be added to the roster.',
        { reason: 'ROSTER_MEMBER_NOT_APPROVED', userIds: notApproved },
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        name: input.name,
        description: input.description,
        resortName: resort.name,
        resortTimeZone: resort.timeZone,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        capacity: input.capacity,
        costCents: input.costCents,
        state: 'CREATED',
        registrationOpensAt: new Date(input.registrationOpensAt),
        registrationClosesAt: new Date(input.registrationClosesAt),
        checkInStartsAt: new Date(input.checkInStartsAt),
        sessionStartsAt: new Date(input.sessionStartsAt),
        exitStartsAt: new Date(input.exitStartsAt),
        createdById: actorId,
        geofence: {
          create: {
            latitude: resort.latitude,
            longitude: resort.longitude,
            radiusMeters: input.radiusMeters,
            label: resort.baseLodgeLabel,
          },
        },
        memberships: {
          create: rosterIds.map((userId) => ({
            userId,
            participation: 'REGISTERED' as const,
            registeredById: actorId,
          })),
        },
      },
    });
    await recordAudit(
      {
        actorId,
        action: 'TRIP_CREATED',
        targetType: 'TRIP',
        targetId: trip.id,
        after: { name: trip.name, resortName: trip.resortName, rosterUserIds: rosterIds },
      },
      tx,
    );
    return (await loadTripDetail(trip.id, actorId, tx))!;
  });
}
