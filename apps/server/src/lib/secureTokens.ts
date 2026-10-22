import { createHash, randomBytes, randomInt } from 'node:crypto';

/** A URL-safe random token with `bytes` of entropy (default 32 bytes = 256 bits). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 of a token, hex encoded. Store this, never the token itself. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Letters and digits that cannot be confused when read aloud or typed (no 0/O, 1/I/L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A random code of `length` characters from an unambiguous alphabet, for club codes. */
export function generateReadableCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
  }
  return code;
}
