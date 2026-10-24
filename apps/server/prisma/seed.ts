import { disconnectDatabase, prisma } from '../src/db/prisma';
import { MembershipStatus, UserRole } from '../src/generated/prisma/enums';
import { hashPassword } from '../src/lib/passwordHasher';

/** Every seeded account signs in with this password (local development only). */
export const SEED_PASSWORD = 'snowsync-dev-password';

/* Sample accounts. Emails use example.com so they can never reach a real inbox. */
const SAMPLE_USERS = [
  { email: 'president@example.com', displayName: 'Paula President', role: UserRole.PRESIDENT },
  { email: 'vp@example.com', displayName: 'Victor Vice', role: UserRole.VICE_PRESIDENT },
  { email: 'treasurer@example.com', displayName: 'Tara Treasurer', role: UserRole.TREASURER },
  { email: 'officer@example.com', displayName: 'Olivia Officer', role: UserRole.OFFICER },
  { email: 'member1@example.com', displayName: 'Jacob Member', role: UserRole.MEMBER },
  { email: 'member2@example.com', displayName: 'Maya Member', role: UserRole.MEMBER },
  { email: 'member3@example.com', displayName: 'Sam Member', role: UserRole.MEMBER },
] as const;

/** One account still waiting for approval, so the approvals screen has something to show. */
const PENDING_USER = { email: 'pending@example.com', displayName: 'Riley Pending' } as const;

async function main(): Promise<void> {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const approved = {
    membershipStatus: MembershipStatus.APPROVED,
    membershipDecidedAt: new Date(),
    onboardingCompletedAt: new Date(),
    passwordHash,
  };
  for (const user of SAMPLE_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { displayName: user.displayName, role: user.role, ...approved },
      create: { ...user, ...approved },
    });
  }
  await prisma.user.upsert({
    where: { email: PENDING_USER.email },
    update: {
      membershipStatus: MembershipStatus.PENDING_APPROVAL,
      passwordHash,
      onboardingCompletedAt: null,
    },
    create: {
      ...PENDING_USER,
      role: UserRole.MEMBER,
      membershipStatus: MembershipStatus.PENDING_APPROVAL,
      passwordHash,
    },
  });
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
