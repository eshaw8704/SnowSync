import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pingDatabase } from '../src/db/databaseHealth';
import { createApp } from '../src/app';

vi.mock('../src/db/databaseHealth', () => ({ pingDatabase: vi.fn() }));
const mockedPing = vi.mocked(pingDatabase);

describe('GET /health', () => {
  beforeEach(() => {
    mockedPing.mockReset();
  });

  it('returns 200 with database up', async () => {
    mockedPing.mockResolvedValue(true);
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: { status: 'ok', uptimeSeconds: expect.any(Number), database: 'up' },
    });
  });

  it('returns 503 and degraded when the database is down', async () => {
    mockedPing.mockResolvedValue(false);
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.data).toMatchObject({ status: 'degraded', database: 'down' });
  });

  it('echoes or generates an X-Request-Id header', async () => {
    mockedPing.mockResolvedValue(true);
    const echoed = await request(createApp()).get('/health').set('X-Request-Id', 'abc-123');
    expect(echoed.headers['x-request-id']).toBe('abc-123');
    const generated = await request(createApp()).get('/health');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
