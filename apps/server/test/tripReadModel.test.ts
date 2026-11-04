import { beforeEach, describe, expect, it } from 'vitest';
import { loadTripDetail, loadTripSummaries } from '../src/modules/trips/tripReadModel';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { createTrip } from './helpers/trips';

describe('trip read model', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('counts spots taken and reports my own participation separately from the trip state', async () => {
    const officer = await createUser({ role: 'OFFICER', displayName: 'Olivia Officer' });
    const member = await createUser();
    const other = await createUser();
    const trip = await createTrip({
      createdById: officer.id,
      state: 'OPEN_FOR_REGISTRATION',
      roster: [{ userId: member.id }, { userId: other.id, participation: 'NOT_REGISTERED' }],
    });

    const [mine] = await loadTripSummaries(member.id, { id: trip.id });
    expect(mine).toMatchObject({
      state: 'OPEN_FOR_REGISTRATION',
      registeredCount: 1,
      myParticipation: 'REGISTERED',
      resortTimeZone: 'America/Los_Angeles',
    });
    const [theirs] = await loadTripSummaries(other.id, { id: trip.id });
    expect(theirs?.myParticipation).toBe('NOT_REGISTERED');
  });

  it('returns the full detail with schedule, geofence and officers', async () => {
    const officer = await createUser({ role: 'OFFICER', displayName: 'Olivia Officer' });
    const president = await createUser({ role: 'PRESIDENT', displayName: 'Paula President' });
    const member = await createUser();
    const trip = await createTrip({
      createdById: officer.id,
      roster: [{ userId: president.id }, { userId: member.id }],
    });

    const detail = await loadTripDetail(trip.id, member.id);
    expect(detail).toMatchObject({
      id: trip.id,
      version: 1,
      geofence: { radiusMeters: 500, label: 'base lodge' },
      officers: [
        { id: officer.id, displayName: 'Olivia Officer', role: 'OFFICER' },
        { id: president.id, displayName: 'Paula President', role: 'PRESIDENT' },
      ],
    });
    expect(Date.parse(detail!.checkInStartsAt)).toBeLessThan(Date.parse(detail!.sessionStartsAt));
    await expect(
      loadTripDetail('00000000-0000-4000-8000-000000000000', member.id),
    ).resolves.toBeNull();
  });
});
