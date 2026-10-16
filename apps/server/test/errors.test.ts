import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../src/app';
import { HttpError } from '../src/lib/httpError';
import { errorHandler } from '../src/middleware/errorHandler';
import { requestLogger } from '../src/middleware/requestLogger';

vi.mock('../src/db/databaseHealth', () => ({ pingDatabase: vi.fn().mockResolvedValue(true) }));

/** A throwaway app that throws on purpose, to test the error handler in isolation. */
function appThatThrows(error: unknown): express.Express {
  const app = express();
  app.use(requestLogger);
  app.get('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe('error handling', () => {
  it('returns 404 with the ApiError envelope for unknown routes', async () => {
    const res = await request(createApp()).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'No route for GET /does-not-exist' },
    });
  });

  it('keeps the code, status and details of an HttpError', async () => {
    const res = await request(
      appThatThrows(new HttpError('CONFLICT', 'Trip is full', { reason: 'TRIP_FULL' })),
    ).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      ok: false,
      error: { code: 'CONFLICT', message: 'Trip is full', details: { reason: 'TRIP_FULL' } },
    });
  });

  it('turns a zod error into VALIDATION_FAILED', async () => {
    const zodError = z.object({ email: z.email() }).safeParse({ email: 'nope' }).error;
    const res = await request(appThatThrows(zodError)).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details.issues[0].path).toBe('email');
  });

  it('hides unknown errors behind INTERNAL with no stack trace', async () => {
    const res = await request(appThatThrows(new Error('secret database detail'))).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Something went wrong on our side.' },
    });
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});
