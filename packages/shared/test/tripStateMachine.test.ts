import { describe, expect, it } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  isOfficerOverride,
  isTerminal,
  nextForwardState,
  scheduledTransitionFor,
  TripState,
  type TripScheduleTimes,
} from '../src';

const STATES = Object.values(TripState);

// complete list of legal transitions, written out by hand so the table wont drift
const LEGAL = new Set([
  'CREATED>OPEN_FOR_REGISTRATION',
  'OPEN_FOR_REGISTRATION>CHECK_IN',
  'CHECK_IN>ACTIVE',
  'ACTIVE>EXIT',
  'EXIT>COMPLETED',
  'CREATED>CANCELLED',
  'OPEN_FOR_REGISTRATION>CANCELLED',
  'CHECK_IN>CANCELLED',
  'ACTIVE>CANCELLED',
  'EXIT>CANCELLED',
]);

describe('trip state machine', () => {
  it.each(STATES.flatMap((from) => STATES.map((to) => [from, to] as const)))(
    '%s → %s matches the System Map',
    (from, to) => {
      expect(canTransition(from, to)).toBe(LEGAL.has(`${from}>${to}`));
    },
  );

  it('lists a rule for every state', () => {
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual([...STATES].sort());
  });

  it('treats only COMPLETED and CANCELLED as terminal', () => {
    expect(STATES.filter(isTerminal)).toEqual(['COMPLETED', 'CANCELLED']);
  });

  it('knows the next forward state', () => {
    expect(nextForwardState('CREATED')).toBe('OPEN_FOR_REGISTRATION');
    expect(nextForwardState('EXIT')).toBe('COMPLETED');
    expect(nextForwardState('COMPLETED')).toBeNull();
    expect(nextForwardState('CANCELLED')).toBeNull();
  });

  it('allows officer overrides only for the four early-start steps', () => {
    expect(isOfficerOverride('CREATED', 'OPEN_FOR_REGISTRATION')).toBe(true);
    expect(isOfficerOverride('ACTIVE', 'EXIT')).toBe(true);
    expect(isOfficerOverride('EXIT', 'COMPLETED')).toBe(false);
    expect(isOfficerOverride('OPEN_FOR_REGISTRATION', 'CANCELLED')).toBe(false);
    expect(isOfficerOverride('CREATED', 'CHECK_IN')).toBe(false);
  });
});

describe('scheduledTransitionFor', () => {
  const schedule: Omit<TripScheduleTimes, 'state'> = {
    registrationOpensAt: '2027-01-18T17:00:00.000Z',
    checkInStartsAt: '2027-02-06T15:30:00.000Z',
    sessionStartsAt: '2027-02-06T16:00:00.000Z',
    exitStartsAt: '2027-02-07T00:00:00.000Z',
  };

  it('returns nothing before the time and the next step once it is due', () => {
    const trip = { ...schedule, state: TripState.CREATED };
    expect(scheduledTransitionFor(trip, new Date('2027-01-18T16:59:59.000Z'))).toBeNull();
    expect(scheduledTransitionFor(trip, new Date('2027-01-18T17:00:00.000Z'))).toEqual({
      from: 'CREATED',
      to: 'OPEN_FOR_REGISTRATION',
      dueAt: new Date('2027-01-18T17:00:00.000Z'),
    });
  });

  it('moves one step at a time even when several are overdue', () => {
    const late = new Date('2027-03-01T00:00:00.000Z');
    expect(scheduledTransitionFor({ ...schedule, state: 'CREATED' }, late)?.to).toBe(
      'OPEN_FOR_REGISTRATION',
    );
    expect(scheduledTransitionFor({ ...schedule, state: 'OPEN_FOR_REGISTRATION' }, late)?.to).toBe(
      'CHECK_IN',
    );
    expect(scheduledTransitionFor({ ...schedule, state: 'CHECK_IN' }, late)?.to).toBe('ACTIVE');
    expect(scheduledTransitionFor({ ...schedule, state: 'ACTIVE' }, late)?.to).toBe('EXIT');
  });

  it('never completes or revives a trip automatically', () => {
    const late = new Date('2027-03-01T00:00:00.000Z');
    expect(scheduledTransitionFor({ ...schedule, state: 'EXIT' }, late)).toBeNull();
    expect(scheduledTransitionFor({ ...schedule, state: 'COMPLETED' }, late)).toBeNull();
    expect(scheduledTransitionFor({ ...schedule, state: 'CANCELLED' }, late)).toBeNull();
  });
});
