import { fireEvent, render, screen } from '@testing-library/react-native';
import { ToggleRow } from '../../src/components/ToggleRow';

describe('ToggleRow', () => {
  it('reports changes and can be locked', () => {
    const onValueChange = jest.fn();
    const { rerender } = render(
      <ToggleRow label="Fundraisers" value={false} onValueChange={onValueChange} />,
    );

    fireEvent(screen.getByLabelText('Fundraisers'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);

    rerender(
      <ToggleRow
        label="Monitor"
        value
        onValueChange={onValueChange}
        disabled
        note="Always on for safety"
      />,
    );

    expect(screen.getByText('Always on for safety')).toBeTruthy();
    expect(screen.getByLabelText('Monitor')).toBeDisabled();
  });
});
