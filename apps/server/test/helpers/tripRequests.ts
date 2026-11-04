import type { CreateTripRequest } from '@snowsync/shared';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A valid POST /trips body: a Sugar Bowl club day 21 days from now, with a correctly ordered schedule. */
export function validTripRequest(overrides: Partial<CreateTripRequest> = {}): CreateTripRequest {
  const startsAt = new Date(Date.now() + 21 * DAY);
  const at = (offset: number) => new Date(startsAt.getTime() + offset).toISOString();
  return {
    name: 'Sugar Bowl club day',
    description: 'A full day on snow with the Sac State crew.',
    startsAt: startsAt.toISOString(),
    endsAt: at(8 * HOUR),
    resortName: 'Sugar Bowl',
    radiusMeters: 500,
    registrationOpensAt: at(-14 * DAY),
    registrationClosesAt: at(-DAY),
    capacity: 24,
    costCents: 4500,
    checkInStartsAt: at(-HOUR / 2),
    sessionStartsAt: startsAt.toISOString(),
    exitStartsAt: at(8 * HOUR),
    rosterUserIds: [],
    ...overrides,
  };
}
