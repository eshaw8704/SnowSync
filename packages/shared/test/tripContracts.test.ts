import { describe, expect, it } from 'vitest';
import {
  createTripRequestSchema,
  findResort,
  RESORT_NAMES,
  RESORTS,
  scheduleOrderIssues,
  transitionRequestSchema,
  updateTripRequestSchema,
} from '../src';

/** A valid Sugar Bowl club day (Figma catalog 09), all times in UTC. */
const valid = {
  name: 'Sugar Bowl club day',
  description: 'A full day on snow with the Sac State crew.',
  startsAt: '2027-02-06T16:00:00.000Z',
  endsAt: '2027-02-07T00:00:00.000Z',
  resortName: 'Sugar Bowl',
  radiusMeters: 500,
  registrationOpensAt: '2027-01-18T17:00:00.000Z',
  registrationClosesAt: '2027-02-05T02:00:00.000Z',
  capacity: 24,
  costCents: 4500,
  checkInStartsAt: '2027-02-06T15:30:00.000Z',
  sessionStartsAt: '2027-02-06T16:00:00.000Z',
  exitStartsAt: '2027-02-07T00:00:00.000Z',
  rosterUserIds: ['3f0c7c2e-8f4b-4c55-9a77-2a1b8f2e9d10'],
};

function paths(result: ReturnType<typeof createTripRequestSchema.safeParse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('trip contracts', () => {
  it('lists the five club resorts, all in Pacific time', () => {
    expect(RESORT_NAMES).toEqual([
      'Palisades Tahoe',
      'Northstar California',
      'Heavenly',
      'Sugar Bowl',
      'Boreal',
    ]);
    expect(RESORTS.every((resort) => resort.timeZone === 'America/Los_Angeles')).toBe(true);
    expect(findResort('Sugar Bowl')?.baseLodgeLabel).toBe('base lodge');
    expect(findResort('Mammoth')).toBeUndefined();
  });

  it('accepts a valid trip', () => {
    expect(createTripRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('enforces name, capacity, cost and radius limits', () => {
    const result = createTripRequestSchema.safeParse({
      ...valid,
      name: 'ab',
      capacity: 201,
      costCents: 100_001,
      radiusMeters: 50,
      resortName: 'Mammoth',
    });
    expect(paths(result).sort()).toEqual([
      'capacity',
      'costCents',
      'name',
      'radiusMeters',
      'resortName',
    ]);
  });

  it('reports a schedule in the wrong order on the later field', () => {
    const result = createTripRequestSchema.safeParse({
      ...valid,
      checkInStartsAt: '2027-02-04T15:30:00.000Z',
    });
    expect(paths(result)).toEqual(['checkInStartsAt']);
    expect(
      scheduleOrderIssues({ ...valid, registrationClosesAt: valid.registrationOpensAt }),
    ).toEqual([
      { path: 'registrationClosesAt', message: 'The deadline must be after registration opens.' },
    ]);
  });

  it('allows check-in to start exactly at the registration deadline', () => {
    expect(scheduleOrderIssues({ ...valid, checkInStartsAt: valid.registrationClosesAt })).toEqual(
      [],
    );
  });

  it('skips ordering checks for fields that are still empty', () => {
    expect(scheduleOrderIssues({ startsAt: valid.startsAt, endsAt: null })).toEqual([]);
  });

  it('refuses duplicate roster members', () => {
    const id = valid.rosterUserIds[0]!;
    expect(paths(createTripRequestSchema.safeParse({ ...valid, rosterUserIds: [id, id] }))).toEqual(
      ['rosterUserIds'],
    );
  });

  it('requires the loaded version on edit and has no roster field', () => {
    const configuration: Partial<typeof valid> = { ...valid };
    delete configuration.rosterUserIds;
    expect(updateTripRequestSchema.safeParse({ ...configuration, version: 3 }).success).toBe(true);
    expect(updateTripRequestSchema.safeParse(configuration).success).toBe(false);
  });

  it('validates transition requests', () => {
    const ok = transitionRequestSchema.safeParse({
      fromState: 'CHECK_IN',
      toState: 'ACTIVE',
      opId: '6a2f1b9e-4c3d-4e8f-9a1b-2c3d4e5f6a7b',
      reason: 'Group is on the lift early',
    });
    expect(ok.success).toBe(true);
    expect(
      transitionRequestSchema.safeParse({ fromState: 'NOPE', toState: 'ACTIVE', opId: 'x' })
        .success,
    ).toBe(false);
  });
});
