import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env';

const valid = {
  NODE_ENV: 'development',
  PORT: '3000',
  LOG_LEVEL: 'info',
  DATABASE_URL: 'postgresql://snowsync:snowsync@localhost:5432/snowsync?schema=public',
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
});
