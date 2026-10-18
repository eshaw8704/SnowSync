import { fireEvent, render, screen } from '@testing-library/react-native';
import { CONTACT_SUPPORT_LABEL, ERROR_COPY, ErrorState } from '../../src/components/ErrorState';

describe('ErrorState', () => {
  it.each([
    [
      'network',
      'Network request failed',
      "We couldn't reach SnowSync. Cached content shows its last-updated time, and queued work isn't delivered yet.",
      'Retry connection',
    ],
    [
      'forbidden',
      "You don't have permission",
      "You don't have permission to access this feature. Officer-only tools aren't available to member accounts.",
      'Back to member Home',
    ],
    [
      'notFound',
      "We can't find this trip",
      'The link may be invalid, or this trip or resource is no longer available.',
      'Back to Trips',
    ],
    [
      'unknown',
      'Something went wrong',
      'Your saved local data is kept. Return to a known screen, and contact club support if this keeps happening.',
      'Back to Home',
    ],
  ] as const)('shows the catalog 33 copy for %s', (variant, title, message, actionLabel) => {
    render(<ErrorState variant={variant} onAction={() => {}} />);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByRole('button', { name: actionLabel })).toBeTruthy();
  });

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
