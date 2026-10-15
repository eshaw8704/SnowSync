import { ApiClientError, apiRequest } from '../../src/api/apiClient';

/** Builds a minimal fetch Response stand-in. */
function jsonResponse(status: number, body: unknown): Response {
  return { status, json: () => Promise.resolve(body) } as unknown as Response;
}

describe('apiRequest', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns data from a successful envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true, data: { status: 'ok' } }));
    await expect(apiRequest('GET', '/health')).resolves.toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/health$/),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns data when ok is true even with a 503 status', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { ok: true, data: { status: 'degraded' } }));
    await expect(apiRequest('GET', '/health')).resolves.toEqual({ status: 'degraded' });
  });

  it('throws the server ApiError from a failed envelope', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { ok: false, error: { code: 'NOT_FOUND', message: 'No route' } }),
    );
    await expect(apiRequest('GET', '/nope')).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'NOT_FOUND',
      message: 'No route',
      status: 404,
    });
  });

  it('throws NETWORK_ERROR when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(apiRequest('GET', '/health')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('throws TIMEOUT when the server does not answer in time', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const pending = apiRequest('GET', '/health');
    jest.advanceTimersByTime(10_000);
    await expect(pending).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('throws INTERNAL for a body that is not a SnowSync envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse(502, { message: 'Bad gateway' }));
    const error = await apiRequest('GET', '/health').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ code: 'INTERNAL', status: 502 });
  });
});
