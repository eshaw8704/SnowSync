import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pingDatabase } from '../src/db/databaseHealth';

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock('../src/db/prisma', () => ({ prisma: { $queryRaw: queryRaw } }));

describe('pingDatabase', () => {
  beforeEach(() => {
    queryRaw.mockReset();
  });

  it('returns true when SELECT 1 succeeds', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    await expect(pingDatabase()).resolves.toBe(true);
  });

  it('returns false when the query fails', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));
    await expect(pingDatabase()).resolves.toBe(false);
  });

  it('returns false when the query takes longer than the timeout', async () => {
    queryRaw.mockReturnValue(new Promise(() => {}));
    await expect(pingDatabase(20)).resolves.toBe(false);
  });
});
