import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dialog } from '../../src/components/Dialog';

describe('Dialog', () => {
  it('shows its content only when visible and fires both actions', () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();
    const { rerender } = render(
      <Dialog
        visible={false}
        title="Approve Riley?"
        primaryLabel="Approve"
        onPrimary={onPrimary}
        secondaryLabel="Cancel"
        onSecondary={onSecondary}
        onDismiss={onSecondary}
      />,
    );
    expect(screen.queryByText('Approve Riley?')).toBeNull();
    rerender(
      <Dialog
        visible
        title="Approve Riley?"
        message="Grants member access."
        primaryLabel="Approve"
        onPrimary={onPrimary}
        secondaryLabel="Cancel"
        onSecondary={onSecondary}
        onDismiss={onSecondary}
      />,
    );
    expect(screen.getByText('Grants member access.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });
});
