import { panelView, parseOutcome } from '../../../src/features/registration/registrationState';
import { HEAVENLY_DETAIL, MY_REGISTRATION } from '../trips/fixtures';

const BEFORE_DEADLINE = new Date('2027-01-20T00:00:00Z');
const AFTER_DEADLINE = new Date('2027-01-29T03:00:00Z');

describe('panelView', () => {
  it('offers Register while open with spots left', () => {
    expect(panelView(HEAVENLY_DETAIL, MY_REGISTRATION, BEFORE_DEADLINE)).toBe('open');
  });

  it('is full when every spot is taken', () => {
    const full = { ...HEAVENLY_DETAIL, registeredCount: 24 };
    expect(panelView(full, MY_REGISTRATION, BEFORE_DEADLINE)).toBe('full');
  });

  it('is closed after the deadline and during check-in', () => {
    expect(panelView(HEAVENLY_DETAIL, MY_REGISTRATION, AFTER_DEADLINE)).toBe('closed');
    const checkIn = { ...HEAVENLY_DETAIL, state: 'CHECK_IN' as const };
    expect(panelView(checkIn, MY_REGISTRATION, BEFORE_DEADLINE)).toBe('closed');
  });

  it('follows my participation before the trip state', () => {
    const at = (participation: typeof MY_REGISTRATION.participation) =>
      panelView(HEAVENLY_DETAIL, { ...MY_REGISTRATION, participation }, AFTER_DEADLINE);
    expect(at('REGISTERED')).toBe('registered');
    expect(at('CHECKED_IN')).toBe('checkedIn');
    expect(at('ACTIVE')).toBe('checkedIn');
    expect(at('NO_SHOW')).toBe('final');
  });

  it('says not yet open for drafts and hides for finished trips', () => {
    expect(panelView({ ...HEAVENLY_DETAIL, state: 'CREATED' }, MY_REGISTRATION)).toBe('notYetOpen');
    expect(panelView({ ...HEAVENLY_DETAIL, state: 'COMPLETED' }, MY_REGISTRATION)).toBe('hidden');
  });
});

describe('parseOutcome', () => {
  it('accepts valid registration outcomes', () => {
    expect(parseOutcome('registered')).toBe('registered');
    expect(parseOutcome('already')).toBe('already');
    expect(parseOutcome('full')).toBe('full');
    expect(parseOutcome('closed')).toBe('closed');
  });

  it('rejects missing or invalid outcomes', () => {
    expect(parseOutcome(undefined)).toBeNull();
    expect(parseOutcome('nonsense')).toBeNull();
    expect(parseOutcome('')).toBeNull();
  });
});
