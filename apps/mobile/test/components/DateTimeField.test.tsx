import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTimeField } from '../../src/components/DateTimeField';

// The native picker does not exist in Jest: a stand-in that "picks" a fixed instant when pressed.
jest.mock('@react-native-community/datetimepicker', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: (props: { testID?: string; onValueChange: (e: object, d: Date) => void }) =>
      createElement(Pressable, {
        testID: props.testID,
        onPress: () => props.onValueChange({ nativeEvent: {} }, new Date(2027, 1, 6, 8, 0)),
      }),
  };
});

describe('DateTimeField', () => {
  it('shows "Not set", opens the picker and reports the chosen instant', () => {
    const onChange = jest.fn();
    render(
      <DateTimeField label="Date" mode="date" value={null} onChange={onChange} testID="date" />,
    );
    expect(screen.getByLabelText('Date, Not set')).toBeTruthy();
    fireEvent.press(screen.getByTestId('date'));
    fireEvent.press(screen.getByTestId('date-picker'));
    expect(onChange).toHaveBeenCalledWith(new Date(2027, 1, 6, 8, 0).toISOString());
    fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByTestId('date-picker')).toBeNull();
  });

  it('shows the value and the error', () => {
    render(
      <DateTimeField
        label="Start time"
        mode="time"
        value={new Date(2027, 1, 6, 8, 0).toISOString()}
        onChange={jest.fn()}
        error="The trip must end after it starts."
      />,
    );
    expect(screen.getByLabelText('Start time, 8:00 AM')).toBeTruthy();
    expect(screen.getByText('The trip must end after it starts.')).toBeTruthy();
  });
});
