import { CLUB_CODE_TTL_DAYS, type ClubCodeResponse } from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { recordAudit } from '../../lib/auditLog';
import { isUniqueViolation } from '../../lib/prismaErrors';
import { generateReadableCode, hashToken } from '../../lib/secureTokens';

/**
 * Creates a one-time club code with a configurable expiration (7 days by default).
 * Only its hash is stored, so the plain code is returned once.
 */
export async function createClubCode(
  actorId: string,
  expiresInDays = CLUB_CODE_TTL_DAYS,
): Promise<ClubCodeResponse> {
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReadableCode(8);
    try {
      const record = await prisma.$transaction(async (tx) => {
        const created = await tx.clubCode.create({
          data: { codeHash: hashToken(code), createdById: actorId, expiresAt },
        });
        await recordAudit(
          {
            actorId,
            action: 'CLUB_CODE_CREATED',
            targetType: 'CLUB_CODE',
            targetId: created.id,
            after: { expiresAt: expiresAt.toISOString() },
          },
          tx,
        );
        return created;
      });
      return { code, expiresAt: record.expiresAt.toISOString() };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
    }
  }
  throw new Error('Could not generate a unique club code.');
}
