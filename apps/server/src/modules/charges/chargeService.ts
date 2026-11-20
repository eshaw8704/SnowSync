import type { ChargeStatus } from '@snowsync/shared';
import type { Prisma } from '../../generated/prisma/client';

const OPEN_STATUSES: ChargeStatus[] = ['UNPAID', 'PROCESSING', 'PAID', 'FAILED', 'OVERDUE'];

const VOIDABLE: ChargeStatus[] = ['UNPAID', 'FAILED', 'OVERDUE'];

export interface ChargeableTrip {
  id: string;
  costCents: number;
  registrationClosesAt: Date;
}

export async function createTripCharge(
  tx: Prisma.TransactionClient,
  userId: string,
  trip: ChargeableTrip,
) {
  if (trip.costCents <= 0) {
    return null;
  }

  const live = await tx.charge.findFirst({
    where: {
      userId,
      tripId: trip.id,
      kind: 'TRIP',
      status: { in: OPEN_STATUSES },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (live) {
    return live;
  }

  return tx.charge.create({
    data: {
      userId,
      tripId: trip.id,
      kind: 'TRIP',
      amountCents: trip.costCents,
      status: 'UNPAID',
      dueAt: trip.registrationClosesAt,
    },
  });
}

export async function releaseTripCharge(
  tx: Prisma.TransactionClient,
  userId: string,
  tripId: string,
): Promise<ChargeStatus | null> {
  const charge = await tx.charge.findFirst({
    where: {
      userId,
      tripId,
      kind: 'TRIP',
      status: { in: OPEN_STATUSES },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!charge) {
    return null;
  }

  let status: ChargeStatus = charge.status;

  if (VOIDABLE.includes(charge.status)) {
    status = 'VOID';
  } else if (charge.status === 'PAID') {
    status = 'REFUND_REVIEW';
  }

  if (status !== charge.status) {
    await tx.charge.update({
      where: { id: charge.id },
      data: { status },
    });
  }

  return status;
}

export async function latestTripCharge(
  client: Prisma.TransactionClient,
  userId: string,
  tripId: string,
) {
  return client.charge.findFirst({
    where: {
      userId,
      tripId,
      kind: 'TRIP',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      status: true,
      amountCents: true,
    },
  });
}
