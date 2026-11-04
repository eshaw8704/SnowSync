import type { ParticipationState, TripState } from '@snowsync/shared';
import { prisma } from '../../src/db/prisma';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Options for {@link createTrip}. Everything has a sensible default. */
export interface CreateTripOptions {
  createdById: string;
  name?: string;
  state?: TripState;
  /** When the trip day starts. Defaults to 14 days from now; the schedule is built around it. */
  startsAt?: Date;
  capacity?: number;
  costCents?: number;
  /** Members to add, each with a participation (REGISTERED by default). */
  roster?: { userId: string; participation?: ParticipationState }[];
}

/**
 * Inserts a trip straight into the test database (no endpoint involved), with a schedule in the
 * correct order: registration opened 7 days before, closes the day before, check-in 30 minutes
 * before the start, active at the start, ending 8 hours later.
 */
export async function createTrip(options: CreateTripOptions) {
  const startsAt = options.startsAt ?? new Date(Date.now() + 14 * DAY);
  const endsAt = new Date(startsAt.getTime() + 8 * HOUR);
  return prisma.trip.create({
    data: {
      name: options.name ?? 'Sugar Bowl club day',
      description: 'A full day on snow with the Sac State crew.',
      resortName: 'Sugar Bowl',
      resortTimeZone: 'America/Los_Angeles',
      startsAt,
      endsAt,
      capacity: options.capacity ?? 24,
      costCents: options.costCents ?? 4500,
      state: options.state ?? 'CREATED',
      registrationOpensAt: new Date(startsAt.getTime() - 7 * DAY),
      registrationClosesAt: new Date(startsAt.getTime() - DAY),
      checkInStartsAt: new Date(startsAt.getTime() - HOUR / 2),
      sessionStartsAt: startsAt,
      exitStartsAt: endsAt,
      createdById: options.createdById,
      geofence: {
        create: {
          latitude: 39.30444,
          longitude: -120.33583,
          radiusMeters: 500,
          label: 'base lodge',
        },
      },
      memberships: {
        create: (options.roster ?? []).map((member) => ({
          userId: member.userId,
          participation: member.participation ?? 'REGISTERED',
          registeredById: options.createdById,
        })),
      },
    },
  });
}
