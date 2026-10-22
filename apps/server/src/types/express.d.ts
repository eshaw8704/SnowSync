import type { MembershipStatus, UserRole } from '@snowsync/shared';

/** Who is making the request, loaded fresh from the database by requireAuth (SS-100). */
export interface AuthContext {
  userId: string;
  role: UserRole;
  membershipStatus: MembershipStatus;
}

declare global {
  // Express's Request type is extended through this namespace (declaration merging).
  namespace Express {
    interface Request {
      /** Set by requireAuth. Undefined on public routes. */
      auth?: AuthContext;
    }
  }
}
