import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env';

const valid = {
  NODE_ENV: 'development',
  PORT: '3000',
  LOG_LEVEL: 'info',
  DATABASE_URL: 'postgresql://snowsync:snowsync@localhost:5432/snowsync?schema=public',
  JWT_ACCESS_SECRET: 'a-development-secret-of-at-least-32-chars',
};

describe('parseEnv', () => {
  it('returns a frozen, typed config', () => {
    const config = parseEnv(valid);
    expect(config.PORT).toBe(3000);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('names every missing variable', () => {
    expect(() => parseEnv({ NODE_ENV: 'development' })).toThrow(
      /PORT[\s\S]*LOG_LEVEL[\s\S]*DATABASE_URL/,
    );
  });

  it('rejects a non-Postgres DATABASE_URL', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: 'mysql://x@localhost/db' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('fills Sprint 2 defaults and requires a long JWT secret', () => {
    const config = parseEnv(valid);
    expect(config.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(config.REFRESH_TOKEN_TTL_DAYS).toBe(30);
    expect(config.PASSWORD_RESET_URL).toBe('snowsync://reset-password');
    expect(() => parseEnv({ ...valid, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });
});
