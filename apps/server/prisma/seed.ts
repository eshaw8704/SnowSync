import { disconnectDatabase, prisma } from '../src/db/prisma';
import { UserRole } from '../src/generated/prisma/enums';

/* Sample accounts. Emails use example.com so they can never reach a real inbox. */
const SAMPLE_USERS = [
  { email: 'officer@example.com', displayName: 'Olivia Officer', role: UserRole.OFFICER },
  { email: 'member1@example.com', displayName: 'Jacob Member', role: UserRole.MEMBER },
  { email: 'member2@example.com', displayName: 'Maya Member', role: UserRole.MEMBER },
  { email: 'member3@example.com', displayName: 'Sam Member', role: UserRole.MEMBER },
] as const;

async function main(): Promise<void> {
  for (const user of SAMPLE_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { displayName: user.displayName, role: user.role },
      create: user,
    });
  }
  const count = await prisma.user.count();
  process.stdout.write(
    `Seed complete: ${SAMPLE_USERS.length} sample users upserted (${count} users total).\n`,
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDatabase();
  });
