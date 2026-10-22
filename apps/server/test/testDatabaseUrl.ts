/**
 * The database every server test uses: a separate `snowsync_test` database on the same local
 * PostgreSQL, so tests never touch your development data. CI sets TEST_DATABASE_URL.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://snowsync:snowsync@localhost:5432/snowsync_test?schema=public';
