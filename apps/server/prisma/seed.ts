import { disconnectDatabase, prisma } from '../src/db/prisma';
import { RESORTS } from '@snowsync/shared';
import {
  MembershipStatus,
  ParticipationState,
  TripState,
  UserRole,
} from '../src/generated/prisma/enums';
import { hashPassword } from '../src/lib/passwordHasher';

/** Every seeded account signs in with this password (local development only). */
export const SEED_PASSWORD = 'snowsync-dev-password';

/* Sample accounts. Emails use example.com so they can never reach a real inbox. */
const SAMPLE_USERS = [
  { email: 'president@example.com', displayName: 'Paula President', role: UserRole.PRESIDENT },
  { email: 'vp@example.com', displayName: 'Victor Vice', role: UserRole.VICE_PRESIDENT },
  { email: 'treasurer@example.com', displayName: 'Tara Treasurer', role: UserRole.TREASURER },
  { email: 'officer@example.com', displayName: 'Olivia Officer', role: UserRole.OFFICER },
  { email: 'member1@example.com', displayName: 'Jacob Member', role: UserRole.MEMBER },
  { email: 'member2@example.com', displayName: 'Maya Member', role: UserRole.MEMBER },
  { email: 'member3@example.com', displayName: 'Sam Member', role: UserRole.MEMBER },
] as const;

/** One account still waiting for approval, so the approvals screen has something to show. */
const PENDING_USER = { email: 'pending@example.com', displayName: 'Riley Pending' } as const;

async function main(): Promise<void> {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const approved = {
    membershipStatus: MembershipStatus.APPROVED,
    membershipDecidedAt: new Date(),
    onboardingCompletedAt: new Date(),
    passwordHash,
  };
  for (const user of SAMPLE_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { displayName: user.displayName, role: user.role, ...approved },
      create: { ...user, ...approved },
    });
  }
  await prisma.user.upsert({
    where: { email: PENDING_USER.email },
    update: {
      membershipStatus: MembershipStatus.PENDING_APPROVAL,
      passwordHash,
      onboardingCompletedAt: null,
    },
    create: {
      ...PENDING_USER,
      role: UserRole.MEMBER,
      membershipStatus: MembershipStatus.PENDING_APPROVAL,
      passwordHash,
    },
  });
  const count = await prisma.user.count();
  const trips = await seedTrips();
  process.stdout.write(
    `Seed complete: ${SAMPLE_USERS.length} sample users upserted (${count} users total), ${trips} sample trips.\n`,
  );
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** One sample trip, with times relative to when the seed runs so the states always make sense. */
interface SampleTrip {
  id: string;
  name: string;
  resortName: (typeof RESORTS)[number]['name'];
  state: TripState;
  /** Trip start, relative to now. */
  startsIn: number;
  registrationOpensIn: number;
  registrationClosesIn: number;
  roster: { email: string; participation: ParticipationState }[];
}

/** Fixed ids so re-running the seed updates the same four trips instead of adding more. */
const SAMPLE_TRIPS: SampleTrip[] = [
  {
    id: '5e1d0a10-0000-4000-8000-000000000001',
    name: 'Sugar Bowl club day',
    resortName: 'Sugar Bowl',
    state: TripState.CREATED,
    startsIn: 21 * DAY,
    registrationOpensIn: 7 * DAY,
    registrationClosesIn: 19 * DAY,
    roster: [],
  },
  {
    id: '5e1d0a10-0000-4000-8000-000000000002',
    name: 'Heavenly club day',
    resortName: 'Heavenly',
    state: TripState.OPEN_FOR_REGISTRATION,
    startsIn: 14 * DAY,
    registrationOpensIn: -2 * DAY,
    registrationClosesIn: 12 * DAY,
    roster: [
      { email: 'officer@example.com', participation: ParticipationState.REGISTERED },
      { email: 'member1@example.com', participation: ParticipationState.REGISTERED },
    ],
  },
  {
    id: '5e1d0a10-0000-4000-8000-000000000003',
    name: 'Palisades Tahoe club day',
    resortName: 'Palisades Tahoe',
    state: TripState.ACTIVE,
    startsIn: -1 * HOUR,
    registrationOpensIn: -14 * DAY,
    registrationClosesIn: -2 * DAY,
    roster: [
      { email: 'officer@example.com', participation: ParticipationState.ACTIVE },
      { email: 'member1@example.com', participation: ParticipationState.ACTIVE },
      { email: 'member2@example.com', participation: ParticipationState.CHECKED_IN },
    ],
  },
  {
    id: '5e1d0a10-0000-4000-8000-000000000004',
    name: 'Boreal club day',
    resortName: 'Boreal',
    state: TripState.COMPLETED,
    startsIn: -30 * DAY,
    registrationOpensIn: -45 * DAY,
    registrationClosesIn: -32 * DAY,
    roster: [
      { email: 'member1@example.com', participation: ParticipationState.CHECKED_OUT },
      { email: 'member3@example.com', participation: ParticipationState.LEFT_EARLY },
    ],
  },
];

/** Upserts the sample trips with their geofences and rosters. Returns how many there are. */
async function seedTrips(): Promise<number> {
  const officer = await prisma.user.findUniqueOrThrow({ where: { email: 'officer@example.com' } });
  const now = Date.now();
  for (const sample of SAMPLE_TRIPS) {
    const resort = RESORTS.find((r) => r.name === sample.resortName)!;
    const startsAt = new Date(now + sample.startsIn);
    const endsAt = new Date(startsAt.getTime() + 8 * HOUR);
    const data = {
      name: sample.name,
      description: 'A full day on snow with the Sac State crew. Meet at the base lodge.',
      resortName: resort.name,
      resortTimeZone: resort.timeZone,
      startsAt,
      endsAt,
      capacity: 24,
      costCents: 4500,
      state: sample.state,
      registrationOpensAt: new Date(now + sample.registrationOpensIn),
      registrationClosesAt: new Date(now + sample.registrationClosesIn),
      checkInStartsAt: new Date(startsAt.getTime() - HOUR / 2),
      sessionStartsAt: startsAt,
      exitStartsAt: endsAt,
      createdById: officer.id,
    };
    await prisma.trip.upsert({
      where: { id: sample.id },
      update: { ...data, version: 1 },
      create: { id: sample.id, ...data },
    });
    const geofence = {
      latitude: resort.latitude,
      longitude: resort.longitude,
      radiusMeters: 500,
      label: resort.baseLodgeLabel,
    };
    await prisma.tripGeofence.upsert({
      where: { tripId: sample.id },
      update: geofence,
      create: { tripId: sample.id, ...geofence },
    });
    for (const member of sample.roster) {
      const user = await prisma.user.findUniqueOrThrow({ where: { email: member.email } });
      await prisma.tripMembership.upsert({
        where: { tripId_userId: { tripId: sample.id, userId: user.id } },
        update: { participation: member.participation },
        create: {
          tripId: sample.id,
          userId: user.id,
          participation: member.participation,
          registeredById: officer.id,
        },
      });
    }
  }
  return SAMPLE_TRIPS.length;
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDatabase();
  });
