import type { MembershipStatus } from '../domain/membershipStatus';
import type { Permission } from '../domain/permission';
import type { UserRole } from '../domain/userRole';

/** GET /me: who the signed-in person is right now, read fresh from the database. */
export interface MeResponse {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  membershipStatus: MembershipStatus;
  onboardingCompleted: boolean;
  permissions: Permission[];
}
