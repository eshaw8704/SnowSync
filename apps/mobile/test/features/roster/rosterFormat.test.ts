import {
  filterRoster,
  initials,
  paymentLabel,
  statusLine,
} from '../../../src/features/roster/rosterFormat';
import { MAYA, PANKAJ, RILEY } from './fixtures';

const TZ = 'America/Los_Angeles';

describe('roster formatting', () => {
  it('filters by on-site, unpaid and officers', () => {
    const all = [MAYA, PANKAJ, RILEY];
    expect(filterRoster(all, 'All')).toEqual(all);
    expect(filterRoster(all, 'Active')).toEqual([MAYA, RILEY]);
    expect(filterRoster(all, 'Unpaid')).toEqual([PANKAJ]);
    expect(filterRoster(all, 'Officers')).toEqual([MAYA]);
  });

  it('makes initials from the first and last name', () => {
    expect(initials('Maya Lee')).toBe('ML');
    expect(initials('Riley Anne Patel')).toBe('RP');
    expect(initials('Cher')).toBe('C');
  });

  it('names the payment state separately from participation', () => {
    expect(paymentLabel(MAYA)).toBe('Paid');
    expect(paymentLabel(PANKAJ)).toBe('Unpaid');
    expect(paymentLabel({ ...PANKAJ, chargeStatus: 'PROCESSING' })).toBe('Awaiting');
    expect(paymentLabel({ ...PANKAJ, chargeStatus: null })).toBeNull();
  });

  it('writes the status line from participation, check-in time, lateness and payment', () => {
    expect(statusLine(MAYA, TZ)).toBe('CHECKED IN · checked in 8:14 AM · paid $45');
    expect(statusLine(RILEY, TZ)).toBe('CHECKED IN · late 9:18 AM · paid $45');
    expect(statusLine(PANKAJ, TZ)).toBe('REGISTERED · not arrived · $45 due');
  });
});
