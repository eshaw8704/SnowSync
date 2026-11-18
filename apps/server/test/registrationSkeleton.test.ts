import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';

describe('Sprint 4 skeleton', () => {
  it('has every Sprint 4 table', async () => {
    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const tables = rows.map((row) => row.table_name);
    for (const table of [
      'charges',
      'waitlist_entries',
      'attendance_events',
      'user_identities',
      'sso_login_codes',
    ]) {
      expect(tables).toContain(table);
    }
  });

  it('adds the check-in columns to trip memberships', async () => {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'trip_memberships'`;
    const columns = rows.map((row) => row.column_name);
    expect(columns).toEqual(
      expect.arrayContaining([
        'checked_in_at',
        'check_in_method',
        'checked_in_by_id',
        'late_minutes',
        'cancelled_at',
      ]),
    );
  });

  it('mounts the new routers without claiming unknown paths', async () => {
    const res = await request(createApp()).get('/admin/trips/nothing-here/unknown');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
