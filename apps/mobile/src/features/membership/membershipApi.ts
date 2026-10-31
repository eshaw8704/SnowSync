import type { MembershipStatusResponse } from '@snowsync/shared';
import { authRequest } from '../../api/authClient';

//GET /membership/status
export function fetchMembershipStatus(): Promise<MembershipStatusResponse> {
  return authRequest<MembershipStatusResponse>('GET', '/membership/status');
}

//POST /membership/code
export function redeemClubCode(code: string): Promise<MembershipStatusResponse> {
  return authRequest<MembershipStatusResponse>('POST', '/membership/code', { body: { code } });
}
