import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('route skeleton', () => {
  it('still answers 404 with the error envelope for unknown routes', async () => {
    const res = await request(createApp()).get('/auth/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
