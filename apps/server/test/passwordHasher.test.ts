import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/passwordHasher';

describe('passwordHasher', () => {
  it('hashes with argon2id and verifies the right password only', async () => {
    const hash = await hashPassword('Powder-Day-2027');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(verifyPassword(hash, 'Powder-Day-2027')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'powder-day-2027')).resolves.toBe(false);
  });

  it('returns false for an account without a password', async () => {
    await expect(verifyPassword(null, 'anything-at-all')).resolves.toBe(false);
  });
});
