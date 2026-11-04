import { prisma } from '../../src/db/prisma';

/** Every table, children first. Add new tables here when a migration creates them. */
const TABLES = [
  'trip_memberships',
  'trip_transitions',
  'trip_geofences',
  'trips',
  'audit_logs',
  'role_permissions',
  'notification_preferences',
  'emergency_contacts',
  'club_codes',
  'password_reset_tokens',
  'refresh_tokens',
  'users',
];

/** Empties every table. Call it in beforeEach so each test starts from a clean database. */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} CASCADE`,
  );
}
