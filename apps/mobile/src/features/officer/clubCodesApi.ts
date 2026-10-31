import type { ClubCodeResponse } from '@snowsync/shared';
import { authRequest } from '../../api/authClient';

/** POST /admin/club-codes: returns the plain code once. */
export const createClubCode = () => authRequest<ClubCodeResponse>('POST', '/admin/club-codes');
