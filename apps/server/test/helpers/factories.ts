import type { MembershipStatus, UserRole } from '@snowsync/shared';
import { prisma } from '../../src/db/prisma';
import { hashPassword } from '../../src/lib/passwordHasher';

/** The password every factory-created user has. */
export const TEST_PASSWORD = 'correct-horse-battery-staple';

let counter = 0;

/** Options for {@link createUser}. Everything has a sensible default. */
export interface CreateUserOptions {
  email?: string;
  displayName?: string;
  role?: UserRole;
  membershipStatus?: MembershipStatus;
  password?: string | null;
  onboardingCompleted?: boolean;
}

/** Inserts one user straight into the test database and returns the row. */
export async function createUser(options: CreateUserOptions = {}) {
  counter += 1;
  const password = options.password === undefined ? TEST_PASSWORD : options.password;
  return prisma.user.create({
    data: {
      email: options.email ?? `user${counter}@csus.edu`,
      displayName: options.displayName ?? `Test User ${counter}`,
      role: options.role ?? 'MEMBER',
      membershipStatus: options.membershipStatus ?? 'APPROVED',
      passwordHash: password === null ? null : await hashPassword(password),
      onboardingCompletedAt: options.onboardingCompleted === false ? null : new Date(),
    },
  });
}
