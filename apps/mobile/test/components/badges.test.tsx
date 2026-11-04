import { render, screen } from '@testing-library/react-native';
import { ParticipationBadge, PARTICIPATION_LABELS } from '../../src/components/ParticipationBadge';
import { TripStateBadge, TRIP_STATE_LABELS } from '../../src/components/TripStateBadge';

describe('trip badges', () => {
  it('uses the exact lifecycle and participation labels from SS-127', () => {
    expect(Object.values(TRIP_STATE_LABELS)).toEqual([
      'Created',
      'Registration open',
      'Check-in',
      'Active',
      'Ending',
      'Completed',
      'Cancelled',
    ]);
    expect(Object.values(PARTICIPATION_LABELS)).toEqual([
      'Not registered',
      'Registered',
      'Checked in',
      'Active',
      'Checked out',
      'No-show',
      'Left early',
    ]);
  });

  it('announces the phase and my status separately, with words not just color', () => {
    render(
      <>
        <TripStateBadge state="CHECK_IN" />
        <ParticipationBadge participation="REGISTERED" />
      </>,
    );
    expect(screen.getByLabelText('TRIP: Check-in')).toBeTruthy();
    expect(screen.getByLabelText('YOU: Registered')).toBeTruthy();
    expect(screen.getByText('Check-in')).toBeTruthy();
  });

  it('can drop the prefix and adds an amber late annotation', () => {
    render(<ParticipationBadge participation="CHECKED_IN" late showPrefix={false} />);
    expect(screen.getByLabelText('Checked in')).toBeTruthy();
    expect(screen.getByLabelText('Late arrival')).toBeTruthy();
  });
});
