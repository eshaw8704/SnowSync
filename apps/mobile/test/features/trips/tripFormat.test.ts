import {
  daysUntil,
  formatCost,
  formatDateTime,
  formatTimeRange,
  formatTripDate,
  formatTripDateWithYear,
  spotsLeftText,
} from '../../../src/features/trips/tripFormat';

const LA = 'America/Los_Angeles';

describe('trip formatting', () => {
  it('shows times in the resort time zone, not UTC', () => {
    // 16:00 UTC on Feb 6, 2027 is 8:00 AM in California.
    expect(formatTripDate('2027-02-06T16:00:00.000Z', LA)).toBe('Sat, Feb 6');
    expect(formatTripDateWithYear('2027-02-06T16:00:00.000Z', LA)).toBe('Sat, Feb 6, 2027');
    expect(formatTimeRange('2027-02-06T16:00:00.000Z', '2027-02-07T00:00:00.000Z', LA)).toBe(
      '8:00 AM–4:00 PM',
    );
    expect(formatDateTime('2027-01-18T17:00:00.000Z', LA)).toBe('Jan 18, 9:00 AM');
  });

  it('formats cost and spots', () => {
    expect(formatCost(4500)).toBe('$45');
    expect(formatCost(4550)).toBe('$45.50');
    expect(formatCost(0)).toBe('Free');
    expect(spotsLeftText(24, 16)).toBe('8 spots left');
    expect(spotsLeftText(24, 23)).toBe('1 spot left');
    expect(spotsLeftText(24, 30)).toBe('Full');
  });

  it('counts whole days to go', () => {
    const now = new Date('2027-01-30T16:00:00.000Z');
    expect(daysUntil('2027-02-06T16:00:00.000Z', now)).toBe(7);
    expect(daysUntil('2027-01-30T20:00:00.000Z', now)).toBe(1);
    expect(daysUntil('2027-01-29T16:00:00.000Z', now)).toBe(0);
  });
});
