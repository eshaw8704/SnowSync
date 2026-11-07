import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTimeField, formatFieldValue } from '../../src/components/DateTimeField';

// The native picker is unavailable in Jest.
// This mock simulates selecting a known UTC instant.
jest.mock('@react-native-community/datetimepicker', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    __esModule: true,
    default: (props: {
      testID?: string;
      timeZoneName?: string;
      onChange: (event: { type: string }, date?: Date) => void;
    }) =>
      createElement(Pressable, {
        testID: props.testID,
        accessibilityLabel: props.timeZoneName,
        onPress: () => props.onChange({ type: 'set' }, new Date('2027-02-06T16:00:00.000Z')),
      }),
  };
});

describe('DateTimeField', () => {
  it('shows "Not set", opens the picker and reports the chosen UTC instant', () => {
    const onChange = jest.fn();

    render(
      <DateTimeField
        label="Date"
        mode="date"
        value={null}
        onChange={onChange}
        timeZone="America/Los_Angeles"
        testID="date"
      />,
    );

    expect(screen.getByLabelText('Date, Not set')).toBeTruthy();

    fireEvent.press(screen.getByTestId('date'));
    expect(screen.getByTestId('date-picker')).toBeTruthy();

    fireEvent.press(screen.getByTestId('date-picker'));

    expect(onChange).toHaveBeenCalledWith('2027-02-06T16:00:00.000Z');
    expect(screen.getByTestId('date-picker').props.accessibilityLabel).toBe('America/Los_Angeles');
  });

  it('displays a winter UTC instant as Pacific Standard Time', () => {
    render(
      <DateTimeField
        label="Start time"
        mode="time"
        value="2027-01-15T16:00:00.000Z"
        onChange={jest.fn()}
        timeZone="America/Los_Angeles"
        error="The trip must end after it starts."
      />,
    );

    expect(screen.getByLabelText('Start time, 8:00 AM')).toBeTruthy();
    expect(screen.getByText('The trip must end after it starts.')).toBeTruthy();
  });

  it('displays a summer UTC instant as Pacific Daylight Time', () => {
    render(
      <DateTimeField
        label="Start time"
        mode="time"
        value="2027-07-15T15:00:00.000Z"
        onChange={jest.fn()}
        timeZone="America/Los_Angeles"
      />,
    );

    expect(screen.getByLabelText('Start time, 8:00 AM')).toBeTruthy();
  });

  it('formats the same UTC instant differently in different time zones', () => {
    const instant = '2027-01-15T16:00:00.000Z';

    expect(formatFieldValue(instant, 'time', 'America/Los_Angeles')).toBe('8:00 AM');
    expect(formatFieldValue(instant, 'time', 'America/New_York')).toBe('11:00 AM');
  });

  it('formats winter and summer dates using the correct Pacific offset', () => {
    expect(formatFieldValue('2027-01-15T16:00:00.000Z', 'time')).toBe('8:00 AM');

    expect(formatFieldValue('2027-07-15T15:00:00.000Z', 'time')).toBe('8:00 AM');
  });
});
