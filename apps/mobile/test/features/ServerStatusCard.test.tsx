import { fireEvent, render, screen } from '@testing-library/react-native';
import { ApiClientError } from '../../src/api/apiClient';
import { ServerStatusCard } from '../../src/features/devStatus/ServerStatusCard';
import { fetchHealth } from '../../src/features/devStatus/healthApi';

jest.mock('../../src/features/devStatus/healthApi', () => ({ fetchHealth: jest.fn() }));
const mockedFetchHealth = jest.mocked(fetchHealth);

describe('ServerStatusCard', () => {
  beforeEach(() => {
    mockedFetchHealth.mockReset();
  });

  it('shows server and database status when the server answers', async () => {
    mockedFetchHealth.mockResolvedValue({ status: 'ok', uptimeSeconds: 12, database: 'up' });
    render(<ServerStatusCard />);
    expect(await screen.findByText('Server: ok')).toBeTruthy();
    expect(screen.getByText('Database: up')).toBeTruthy();
  });

  it('shows degraded when the database is down', async () => {
    mockedFetchHealth.mockResolvedValue({ status: 'degraded', uptimeSeconds: 3, database: 'down' });
    render(<ServerStatusCard />);
    expect(await screen.findByText('Server: degraded')).toBeTruthy();
    expect(screen.getByText('Database: down')).toBeTruthy();
  });

  it('shows unreachable with a working retry when the network fails', async () => {
    mockedFetchHealth.mockRejectedValueOnce(
      new ApiClientError({ code: 'NETWORK_ERROR', message: 'Could not reach the server.' }),
    );
    mockedFetchHealth.mockResolvedValueOnce({ status: 'ok', uptimeSeconds: 1, database: 'up' });
    render(<ServerStatusCard />);
    expect(await screen.findByText('Server: unreachable')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Server: ok')).toBeTruthy();
    expect(mockedFetchHealth).toHaveBeenCalledTimes(2);
  });
});
