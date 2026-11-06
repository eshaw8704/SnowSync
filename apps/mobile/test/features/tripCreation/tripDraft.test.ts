import type { TripDetail } from '@snowsync/shared';
import {
  draftToCreateRequest,
  draftToUpdateRequest,
  EMPTY_DRAFT,
  parseCapacity,
  parseCostCents,
  tripDetailToDraft,
  validateConfiguration,
  validateStep,
  withDefaultSchedule,
} from '../../../src/features/tripCreation/tripDraft';
import { VALID_DRAFT } from './fixtures';

describe('trip draft', () => {
  it('parses capacity and cost the way officers type them', () => {
    expect(parseCapacity('24')).toBe(24);
    expect(parseCapacity('2.5')).toBeNaN();
    expect(parseCostCents('45')).toBe(4500);
    expect(parseCostCents('$45.5')).toBe(4550);
    expect(parseCostCents('45.555')).toBeNaN();
  });

  it('reports errors only on the step where they were entered', () => {
    expect(validateStep(1, EMPTY_DRAFT)).toEqual({
      name: 'Use at least 3 characters.',
      startsAt: 'Choose a date and time.',
      endsAt: 'Choose a date and time.',
    });
    expect(validateStep(3, { ...VALID_DRAFT, capacityText: 'lots', costText: '-1' })).toEqual({
      capacityText: 'Enter how many members can join.',
      costText: 'Enter the cost per member.',
    });
    expect(validateStep(2, { ...VALID_DRAFT, resortName: null })).toEqual({
      resortName: 'Choose a resort.',
    });
  });

  it('shows schedule-order mistakes on the later field', () => {
    const early = { ...VALID_DRAFT, checkInStartsAt: '2027-02-04T15:30:00.000Z' };
    expect(validateStep(4, early)).toEqual({
      checkInStartsAt: 'Check-in cannot start before the registration deadline.',
    });
    expect(validateStep(3, early)).toEqual({});
    const backwards = { ...VALID_DRAFT, endsAt: '2027-02-06T15:00:00.000Z' };
    expect(validateStep(1, backwards)).toEqual({ endsAt: 'The trip must end after it starts.' });
  });

  it('finds the first invalid step across the whole configuration', () => {
    expect(validateConfiguration(VALID_DRAFT).firstInvalidStep).toBeNull();
    expect(validateConfiguration({ ...VALID_DRAFT, capacityText: '' }).firstInvalidStep).toBe(3);
  });

  it('builds create and update requests', () => {
    const roster = [
      {
        id: '3f0c7c2e-8f4b-4c55-9a77-2a1b8f2e9d10',
        displayName: 'Maya Lee',
        email: 'maya@csus.edu',
        role: 'OFFICER' as const,
      },
    ];
    expect(draftToCreateRequest({ ...VALID_DRAFT, roster })).toMatchObject({
      capacity: 24,
      costCents: 4500,
      rosterUserIds: [roster[0]!.id],
    });
    const update = draftToUpdateRequest(VALID_DRAFT, 3);
    expect(update.version).toBe(3);
    expect('rosterUserIds' in update).toBe(false);
  });

  it('fills a default schedule from the trip day', () => {
    const filled = withDefaultSchedule({
      ...VALID_DRAFT,
      checkInStartsAt: null,
      sessionStartsAt: null,
      exitStartsAt: null,
    });
    expect(filled).toMatchObject({
      checkInStartsAt: '2027-02-06T15:30:00.000Z',
      sessionStartsAt: VALID_DRAFT.startsAt,
      exitStartsAt: VALID_DRAFT.endsAt,
    });
  });

  it('starts the Edit trip screen from a saved trip', () => {
    const trip = {
      ...draftToCreateRequest(VALID_DRAFT),
      id: 't1',
      resortTimeZone: 'America/Los_Angeles',
      state: 'CREATED',
      registeredCount: 0,
      myParticipation: 'NOT_REGISTERED',
      version: 2,
      costCents: 4550,
      geofence: { latitude: 39.3, longitude: -120.3, radiusMeters: 750, label: 'base lodge' },
      officers: [],
    } as unknown as TripDetail;
    expect(tripDetailToDraft(trip)).toMatchObject({
      costText: '45.50',
      capacityText: '24',
      radiusMeters: 750,
    });
  });
});
