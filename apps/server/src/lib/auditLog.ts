import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../db/prisma';

/** Audit actions used in Sprint 2. Later sprints add more. */
export type AuditAction =
  | 'MEMBERSHIP_APPROVED'
  | 'MEMBERSHIP_REJECTED'
  | 'MEMBERSHIP_APPROVED_BY_CLUB_CODE'
  | 'CLUB_CODE_CREATED'
  | 'ROLE_PERMISSIONS_UPDATED';

/** One audit entry. `before` and `after` are JSON snapshots of what changed. */
export interface AuditEntry {
  actorId: string;
  action: AuditAction;
  targetType: 'USER' | 'CLUB_CODE' | 'ROLE';
  targetId: string;
  reason?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

/**
 * Writes one audit row. Pass `tx` to write it inside the same transaction as the change,
 * so a change is never saved without its audit record.
 */
export async function recordAudit(
  entry: AuditEntry,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      reason: entry.reason ?? null,
      before: entry.before,
      after: entry.after,
    },
  });
}
