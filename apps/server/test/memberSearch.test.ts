import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { bearerFor } from './helpers/session';

describe('GET /admin/members/search', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('matches name or email case-insensitively, approved members only', async () => {
    const officer = await createUser({ role: 'OFFICER', displayName: 'Olivia Officer' });
    await createUser({ displayName: 'Jessica Park', email: 'jpark@csus.edu' });
    await createUser({ displayName: 'Sam Kim', email: 'jess.kim@csus.edu' });
    await createUser({ displayName: 'Jess Pending', membershipStatus: 'PENDING_APPROVAL' });
    const res = await request(createApp())
      .get('/admin/members/search?q=JESS')
      .set('Authorization', await bearerFor(officer.id));
    expect(res.status).toBe(200);
    expect(res.body.data.map((m: { displayName: string }) => m.displayName)).toEqual([
      'Jessica Park',
      'Sam Kim',
    ]);
    const first = res.body.data[0] as Record<string, unknown>;
    expect(Object.keys(first).sort()).toEqual(['displayName', 'email', 'id', 'role']);
  });

  it('returns at most 25 results', async () => {
    const officer = await createUser({ role: 'OFFICER' });
    for (let i = 0; i < 27; i += 1) {
      await createUser({ displayName: `Skier ${String(i).padStart(2, '0')}`, password: null });
    }
    const res = await request(createApp())
      .get('/admin/members/search?q=skier')
      .set('Authorization', await bearerFor(officer.id));
    expect(res.body.data).toHaveLength(25);
  });

  it('is forbidden for members', async () => {
    const member = await createUser();
    const res = await request(createApp())
      .get('/admin/members/search?q=a')
      .set('Authorization', await bearerFor(member.id));
    expect(res.status).toBe(403);
  });
});
