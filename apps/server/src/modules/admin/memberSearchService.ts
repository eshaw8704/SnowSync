import { MEMBER_SEARCH_LIMIT, type MemberSearchResult } from '@snowsync/shared';
import { prisma } from '../../db/prisma';

/**
 * Approved members whose name or email contains `query` (case-insensitive), alphabetically, at most
 * 25. An empty query returns the first 25 approved members. Used to build a trip's initial roster.
 */
export async function searchApprovedMembers(query: string): Promise<MemberSearchResult[]> {
  const q = query.trim();
  return prisma.user.findMany({
    where: {
      membershipStatus: 'APPROVED',
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    select: { id: true, displayName: true, email: true, role: true },
    orderBy: [{ displayName: 'asc' }, { email: 'asc' }],
    take: MEMBER_SEARCH_LIMIT,
  });
}
