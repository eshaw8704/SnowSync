import { fireEvent, render, screen } from '@testing-library/react-native';
import { EmptyState } from '../../src/components/EmptyState';

describe('EmptyState', () => {
  it('shows the title, subtitle, status, message and exactly one action', () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        title="No trips open"
        subtitle="Club announcements"
        statusLabel="Closed"
        message="Officers have not opened any new trips."
        actionLabel="View announcements"
        onAction={onAction}
      />,
    );
    expect(screen.getByText('No trips open')).toBeTruthy();
    expect(screen.getByText('Club announcements')).toBeTruthy();
    expect(screen.getByText('Closed')).toBeTruthy();
    expect(screen.getByText('Officers have not opened any new trips.')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.press(screen.getByRole('button', { name: 'View announcements' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits the optional subtitle and status chip', () => {
    render(
      <EmptyState
        title="Inbox is clear"
        message="You're caught up."
        actionLabel="Back to Home"
        onAction={() => {}}
      />,
    );
    expect(screen.queryByText('Closed')).toBeNull();
  });
});
