import type { MeResponse } from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../lib/httpError';
import { getEffectivePermissions } from '../permissions/permissionService';

/** Builds the GET /me response from the database. */
export async function getMe(userId: string): Promise<MeResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new HttpError('UNAUTHORIZED', 'Your session has expired. Sign in again.');
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    membershipStatus: user.membershipStatus,
    onboardingCompleted: user.onboardingCompletedAt !== null,
    permissions: await getEffectivePermissions(user.role),
  };
}
