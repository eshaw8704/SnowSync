import { Prisma } from '../generated/prisma/client';

/** True when `error` is Prisma's "unique constraint failed" error (code P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
