import {
  findResort,
  type TripState,
  type UpdateTripRequest,
  type UpdateTripResponse,
} from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { recordAudit } from '../../lib/auditLog';
import { HttpError } from '../../lib/httpError';
import { loadTripDetail } from './tripReadModel';

/** The configuration is editable until the trip becomes ACTIVE. */
const EDITABLE: TripState[] = ['CREATED', 'OPEN_FOR_REGISTRATION', 'CHECK_IN'];

function notFound(): HttpError {
  return new HttpError('NOT_FOUND', "We can't find this trip.");
}

function notEditable(): HttpError {
  return new HttpError('CONFLICT', 'This trip is already active and can no longer be edited.', {
    reason: 'TRIP_NOT_EDITABLE',
  });
}

/**
 * PATCH /trips/:id. Saves the full configuration only if the trip is still at the version the
 * officer loaded (optimistic concurrency): the UPDATE says `WHERE version = loaded`, so if another
 * officer saved first, nothing is overwritten and the caller gets 409 STALE_VERSION.
 */
export async function updateTrip(
  actorId: string,
  tripId: string,
  input: UpdateTripRequest,
): Promise<UpdateTripResponse> {
  const resort = findResort(input.resortName);
  if (!resort) {
    throw new HttpError('VALIDATION_FAILED', 'Choose a resort from the list.');
  }
  return prisma.$transaction(async (tx) => {
    const before = await tx.trip.findUnique({ where: { id: tripId } });
    if (!before) throw notFound();
    if (!EDITABLE.includes(before.state)) throw notEditable();

    const updated = await tx.trip.updateMany({
      where: { id: tripId, version: input.version, state: { in: EDITABLE } },
      data: {
        name: input.name,
        description: input.description,
        resortName: resort.name,
        resortTimeZone: resort.timeZone,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        capacity: input.capacity,
        costCents: input.costCents,
        registrationOpensAt: new Date(input.registrationOpensAt),
        registrationClosesAt: new Date(input.registrationClosesAt),
        checkInStartsAt: new Date(input.checkInStartsAt),
        sessionStartsAt: new Date(input.sessionStartsAt),
        exitStartsAt: new Date(input.exitStartsAt),
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      const current = await tx.trip.findUnique({ where: { id: tripId } });
      if (!current) throw notFound();
      if (!EDITABLE.includes(current.state)) throw notEditable();
      throw new HttpError(
        'CONFLICT',
        'Someone else changed this trip. Reload to see the latest version.',
        { reason: 'STALE_VERSION', currentVersion: current.version },
      );
    }
    await tx.tripGeofence.update({
      where: { tripId },
      data: {
        latitude: resort.latitude,
        longitude: resort.longitude,
        radiusMeters: input.radiusMeters,
        label: resort.baseLodgeLabel,
      },
    });
    await recordAudit(
      {
        actorId,
        action: 'TRIP_UPDATED',
        targetType: 'TRIP',
        targetId: tripId,
        before: { name: before.name, version: before.version, capacity: before.capacity },
        after: { name: input.name, version: input.version + 1, capacity: input.capacity },
      },
      tx,
    );
    return {
      trip: (await loadTripDetail(tripId, actorId, tx))!,
      wasPublished: before.state !== 'CREATED',
    };
  });
}

export async function deleteTrip(actorId: string, tripId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { _count: { select: { memberships: true } } },
    });
    if (!trip) throw notFound();
    if (trip.state !== 'CREATED' || trip._count.memberships > 0) {
      throw new HttpError('CONFLICT', 'Cancel this trip instead', { reason: 'DELETE_NOT_ALLOWED' });
    }
    const deleted = await tx.trip.deleteMany({ where: { id: tripId, state: 'CREATED' } });
    if (deleted.count === 0) {
      throw new HttpError('CONFLICT', 'Cancel this trip instead', { reason: 'DELETE_NOT_ALLOWED' });
    }
    await recordAudit(
      {
        actorId,
        action: 'TRIP_DELETED',
        targetType: 'TRIP',
        targetId: tripId,
        before: { name: trip.name, resortName: trip.resortName },
      },
      tx,
    );
  });
}
