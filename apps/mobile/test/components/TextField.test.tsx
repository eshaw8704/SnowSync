import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextField } from '../../src/components/TextField';

describe('TextField', () => {
  it('is labelled and reports typing', () => {
    const onChangeText = jest.fn();
    render(<TextField label="Sac State email" value="" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByLabelText('Sac State email'), 'jacob@csus.edu');
    expect(onChangeText).toHaveBeenCalledWith('jacob@csus.edu');
  });

  it('shows an error instead of the helper text', () => {
    const { rerender } = render(
      <TextField
        label="Password"
        value=""
        onChangeText={() => {}}
        helperText="Use at least 12 characters."
      />,
    );
    expect(screen.getByText('Use at least 12 characters.')).toBeTruthy();
    rerender(
      <TextField
        label="Password"
        value=""
        onChangeText={() => {}}
        helperText="Help"
        error="Too short."
      />,
    );
    expect(screen.getByText('Too short.')).toBeTruthy();
    expect(screen.queryByText('Help')).toBeNull();
  });
});
