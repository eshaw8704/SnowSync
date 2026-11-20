import { describe, expect, it } from 'vitest';
import {
  ALLOWED_PARTICIPATION_CHANGES,
  ATTENDANCE_STATES,
  canChangeParticipation,
  holdsSpot,
  ParticipationState,
} from '../src';

const STATES = Object.values(ParticipationState);

const LEGAL = new Set([
  'NOT_REGISTERED>REGISTERED',
  'REGISTERED>NOT_REGISTERED',
  'REGISTERED>CHECKED_IN',
  'REGISTERED>NO_SHOW',
  'CHECKED_IN>ACTIVE',
  'CHECKED_IN>CHECKED_OUT',
  'CHECKED_IN>LEFT_EARLY',
  'ACTIVE>CHECKED_OUT',
  'ACTIVE>LEFT_EARLY',
]);

describe('participation state machine', () => {
  it.each(STATES.flatMap((from) => STATES.map((to) => [from, to] as const)))(
    '%s -> %s matches the System Map',
    (from, to) => {
      expect(canChangeParticipation(from, to)).toBe(LEGAL.has(`${from}>${to}`));
    },
  );

  it('has a row for every state', () => {
    expect(Object.keys(ALLOWED_PARTICIPATION_CHANGES).sort()).toEqual([...STATES].sort());
  });

  it('makes checked out, no-show and left early final', () => {
    for (const state of ['CHECKED_OUT', 'NO_SHOW', 'LEFT_EARLY'] as const) {
      expect(ALLOWED_PARTICIPATION_CHANGES[state]).toEqual([]);
    }
  });

  it('counts registered, checked in and active members against capacity', () => {
    expect(STATES.filter(holdsSpot)).toEqual(['REGISTERED', 'CHECKED_IN', 'ACTIVE']);
  });

  it('routes checked in and active members to attendance actions', () => {
    expect(ATTENDANCE_STATES).toEqual(['CHECKED_IN', 'ACTIVE']);
  });
});
