import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';

/** The one PrismaClient for the whole server. Import this; never construct another. */
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

/** Closes the database pool. Called once during graceful shutdown. */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}