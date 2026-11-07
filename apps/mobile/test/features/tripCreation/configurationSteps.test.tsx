import { fireEvent, render, screen } from '@testing-library/react-native';
import { BasicsStep, withDay, withTime } from '../../../src/features/tripCreation/steps/BasicsStep';
import { geofenceLabel, ResortStep } from '../../../src/features/tripCreation/steps/ResortStep';
import { RegistrationStep } from '../../../src/features/tripCreation/steps/RegistrationStep';
import { EMPTY_DRAFT } from '../../../src/features/tripCreation/tripDraft';

jest.mock('@react-native-community/datetimepicker', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    __esModule: true,
    default: (props: {
      testID?: string;
      onChange: (event: { type: string }, date?: Date) => void;
    }) =>
      createElement(Pressable, {
        testID: props.testID,
        onPress: () => props.onChange({ type: 'set' }, new Date('2027-07-15T15:00:00.000Z')),
      }),
  };
});

describe('wizard steps 1 to 3', () => {
  it('Basics edits the name and shows field errors', () => {
    const onChange = jest.fn();

    render(
      <BasicsStep
        value={EMPTY_DRAFT}
        onChange={onChange}
        errors={{ name: 'Use at least 3 characters.' }}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Trip name'), 'Sugar Bowl club day');

    expect(onChange).toHaveBeenCalledWith({ name: 'Sugar Bowl club day' });
    expect(screen.getByText('Use at least 3 characters.')).toBeTruthy();
    expect(
      screen.getByText('You can edit the date and time up until the trip goes ACTIVE.'),
    ).toBeTruthy();
  });

  it('preserves resort-local time when changing the trip date', () => {
    const timeZone = 'America/Los_Angeles';
    const start = '2027-01-15T16:30:00.000Z';

    expect(withDay(start, new Date('2027-02-13T16:00:00.000Z'), 9, timeZone)).toBe(
      '2027-02-13T16:30:00.000Z',
    );

    expect(withDay(null, new Date('2027-02-13T16:00:00.000Z'), 16, timeZone)).toBe(
      '2027-02-14T00:00:00.000Z',
    );

    expect(withTime(start, new Date('2027-01-01T17:30:00.000Z'), timeZone)).toBe(
      '2027-01-15T17:30:00.000Z',
    );
  });

  it('adjusts the UTC offset when moving a trip between PST and PDT', () => {
    const timeZone = 'America/Los_Angeles';
    const winterStart = '2027-01-15T16:00:00.000Z';
    const summerDay = new Date('2027-07-15T15:00:00.000Z');

    expect(withDay(winterStart, summerDay, 8, timeZone)).toBe('2027-07-15T15:00:00.000Z');

    expect(withDay(null, summerDay, 16, timeZone)).toBe('2027-07-15T23:00:00.000Z');
  });

  it('moves a nonexistent spring-forward time to a valid time', () => {
    const timeZone = 'America/Los_Angeles';

    // March 14, 2027: 2:30 AM does not exist in Pacific time.
    // Preserve the minutes by moving the time to 3:30 AM PDT.
    const previousDay = '2027-03-13T10:30:00.000Z';
    const springDay = new Date('2027-03-14T19:00:00.000Z');

    expect(withDay(previousDay, springDay, 8, timeZone)).toBe('2027-03-14T10:30:00.000Z');
  });

  it('chooses the earlier occurrence during fall-back', () => {
    const timeZone = 'America/Los_Angeles';

    // November 7, 2027: 1:30 AM occurs twice.
    // Choose the earlier occurrence, which is still PDT.
    const previousDay = '2027-11-06T08:30:00.000Z';
    const fallDay = new Date('2027-11-07T20:00:00.000Z');

    expect(withDay(previousDay, fallDay, 8, timeZone)).toBe('2027-11-07T08:30:00.000Z');
  });

  it('updates all five trip and lifecycle timestamps when the date changes', () => {
    const onChange = jest.fn();

    const draft = {
      ...EMPTY_DRAFT,
      resortName: 'Sugar Bowl' as const,
      startsAt: '2027-01-15T16:30:00.000Z',
      endsAt: '2027-01-16T00:00:00.000Z',
      checkInStartsAt: '2027-01-15T15:30:00.000Z',
      sessionStartsAt: '2027-01-15T17:00:00.000Z',
      exitStartsAt: '2027-01-15T23:30:00.000Z',
    };

    render(<BasicsStep value={draft} onChange={onChange} errors={{}} />);

    fireEvent.press(screen.getByTestId('trip-date'));
    fireEvent.press(screen.getByTestId('trip-date-picker'));

    expect(onChange).toHaveBeenCalledWith({
      startsAt: '2027-07-15T15:30:00.000Z',
      endsAt: '2027-07-15T23:00:00.000Z',
      checkInStartsAt: '2027-07-15T14:30:00.000Z',
      sessionStartsAt: '2027-07-15T16:00:00.000Z',
      exitStartsAt: '2027-07-15T22:30:00.000Z',
    });
  });

  it('Resort lists the five resorts and labels the geofence', () => {
    const onChange = jest.fn();

    render(
      <ResortStep
        value={{ ...EMPTY_DRAFT, resortName: 'Sugar Bowl' }}
        onChange={onChange}
        errors={{}}
      />,
    );

    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: 'Sugar Bowl' })).toBeSelected();

    fireEvent.press(screen.getByRole('radio', { name: 'Heavenly' }));

    expect(onChange).toHaveBeenCalledWith({ resortName: 'Heavenly' });
    expect(screen.getByText('Resort boundary · 500 m around base lodge')).toBeTruthy();
    expect(geofenceLabel(750, 'base lodge')).toBe('Resort boundary · 750 m around base lodge');
  });

  it('Registration shows capacity and cost errors on their fields', () => {
    render(
      <RegistrationStep
        value={EMPTY_DRAFT}
        onChange={jest.fn()}
        errors={{
          capacityText: 'Enter how many members can join.',
          registrationClosesAt: 'The deadline must be after registration opens.',
        }}
      />,
    );

    expect(screen.getByText('Enter how many members can join.')).toBeTruthy();
    expect(screen.getByText('The deadline must be after registration opens.')).toBeTruthy();
  });
});
