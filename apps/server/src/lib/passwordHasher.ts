import { hash, verify } from '@node-rs/argon2';

/** OWASP-recommended argon2id settings: 19 MiB memory, 2 iterations, 1 lane. */
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

/**
 * A valid argon2id hash of a random password, used when an email has no account so that
 * "wrong email" and "wrong password" take the same time (no account enumeration by timing).
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$iMfB+jILHUxVeSsA8vvzig$RjL10OYWt04OiBj0sljynF5OZ9vRLZREDOy5wg1zwGc';

/** Hashes a password with argon2id. The result includes its own salt and settings. */
export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Checks `password` against `passwordHash`. When `passwordHash` is null (no such account, or an
 * SSO-only account) it still does the same work and returns false.
 */
export async function verifyPassword(
  passwordHash: string | null,
  password: string,
): Promise<boolean> {
  try {
    const matches = await verify(passwordHash ?? DUMMY_HASH, password);
    return passwordHash !== null && matches;
  } catch {
    return false;
  }
}
