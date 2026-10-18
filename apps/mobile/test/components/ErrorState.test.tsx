import { fireEvent, render, screen } from '@testing-library/react-native';
import { CONTACT_SUPPORT_LABEL, ERROR_COPY, ErrorState } from '../../src/components/ErrorState';

describe('ErrorState', () => {
  it.each(['network', 'forbidden', 'notFound', 'unknown'] as const)(
    'shows the catalog 33 copy for %s',
    (variant) => {
      render(<ErrorState variant={variant} onAction={() => {}} />);
      expect(screen.getByText(ERROR_COPY[variant].title)).toBeTruthy();
      expect(screen.getByText(ERROR_COPY[variant].message)).toBeTruthy();
      expect(screen.getByRole('button', { name: ERROR_COPY[variant].actionLabel })).toBeTruthy();
    },
  );

  it('uses the exact network copy from the catalog', () => {
    expect(ERROR_COPY.network).toEqual({
      title: 'Network request failed',
      message:
        "We couldn't reach SnowSync. Cached content shows its last-updated time, and queued work isn't delivered yet.",
      actionLabel: 'Retry connection',
    });
  });

  it('fires the primary action and shows contact support only when provided', () => {
    const onAction = jest.fn();
    const onContactSupport = jest.fn();
    const { rerender } = render(<ErrorState variant="network" onAction={onAction} />);
    expect(screen.queryByRole('button', { name: CONTACT_SUPPORT_LABEL })).toBeNull();
    rerender(
      <ErrorState variant="network" onAction={onAction} onContactSupport={onContactSupport} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Retry connection' }));
    fireEvent.press(screen.getByRole('button', { name: CONTACT_SUPPORT_LABEL }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onContactSupport).toHaveBeenCalledTimes(1);
  });

  it('accepts title, message and action label overrides', () => {
    render(
      <ErrorState
        variant="notFound"
        title="We can't find this member"
        message="Custom."
        actionLabel="Back to Members"
        onAction={() => {}}
      />,
    );
    expect(screen.getByText("We can't find this member")).toBeTruthy();
    expect(screen.getByText('Custom.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Members' })).toBeTruthy();
  });
});
