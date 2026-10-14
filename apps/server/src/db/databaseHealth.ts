import { prisma } from './prisma';

/**
 * Returns true when PostgreSQL answers a trivial query within `timeoutMs`.
 * Never throws: any error or timeout counts as "down".
 */
export async function pingDatabase(timeoutMs = 2000): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  const query = prisma.$queryRaw`SELECT 1`.then(
    () => true,
    () => false,
  );
  try {
    return await Promise.race([query, timeout]);
  } finally {
    clearTimeout(timer);
  }
}