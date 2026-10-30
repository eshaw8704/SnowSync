import type { MembershipDecisionRequest, PendingMembershipItem } from '@snowsync/shared';
import { authRequest } from '../../api/authClient';

/** GET /admin/memberships */
export const fetchPendingMemberships = () =>
  authRequest<PendingMembershipItem[]>('GET', '/admin/memberships');

/** POST /admin/memberships/:userId/decision */
export const decideMembership = (userId: string, decision: MembershipDecisionRequest) =>
  authRequest<{ decided: true }>('POST', `/admin/memberships/${userId}/decision`, {
    body: decision,
  });
