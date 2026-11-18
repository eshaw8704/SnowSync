import { z } from 'zod';
import type { ChargeStatus } from '../domain/charge';
import type { ParticipationState } from '../domain/participationState';
import type { TripState } from '../domain/tripState';
import type { UserRole } from '../domain/userRole';

/** How someone was checked in. */
export const CheckInMethod = {
  SELF: 'SELF',
  GEOFENCE: 'GEOFENCE',
  OFFICER: 'OFFICER',
} as const;

export type CheckInMethod = (typeof CheckInMethod)[keyof typeof CheckInMethod];

/**
 * Who or what caused one participation change, recorded on every attendance event: the member
 * themselves, an officer, the phone's geofence, or the system.
 */
export const AttendanceMethod = {
  SELF: 'SELF',
  OFFICER: 'OFFICER',
  GEOFENCE: 'GEOFENCE',
  SYSTEM: 'SYSTEM',
} as const;

export type AttendanceMethod = (typeof AttendanceMethod)[keyof typeof AttendanceMethod];

/** Waitlist entry status. Nothing promotes people automatically: an officer converts them. */
export const WaitlistStatus = {
  WAITING: 'WAITING',
  CONVERTED: 'CONVERTED',
  LEFT: 'LEFT',
} as const;

export type WaitlistStatus = (typeof WaitlistStatus)[keyof typeof WaitlistStatus];

/** Officer reasons (roster removal, manual check-in) are required and kept short. */
export const OFFICER_REASON_MIN_LENGTH = 3;
export const OFFICER_REASON_MAX_LENGTH = 500;

const officerReason = z
  .string()
  .trim()
  .min(OFFICER_REASON_MIN_LENGTH, { message: 'Explain why in a few words.' })
  .max(OFFICER_REASON_MAX_LENGTH, {
    message: `Use ${OFFICER_REASON_MAX_LENGTH} characters or fewer.`,
  });

/** POST /trips/:tripId/registration. The client-generated opId makes a retry harmless. */
export const registerRequestSchema = z.object({ opId: z.uuid() });
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

/** The caller's own registration on one trip, as GET /trips/:tripId/registration returns it. */
export interface MyRegistration {
  tripId: string;
  participation: ParticipationState;
  /** The trip charge's status, or null when the trip is free or the caller was never registered. */
  chargeStatus: ChargeStatus | null;
  /** Amount of the trip charge in cents, or null. */
  chargeAmountCents: number | null;
  /** True while the caller has a WAITING waitlist entry. */
  waitlisted: boolean;
  /** Check-in details, set once checked. */
  checkedInAt: string | null;
  checkInMethod: CheckInMethod | null;
  checkedInByName: string | null;
  /** Minutes after the active session started, recorded as an annotation; null when on time. */
  lateMinutes: number | null;
}

/** Response of POST /trips/:tripId/registration. */
export interface RegisterResult {
  registration: MyRegistration;
  /** True when the caller was already registered: nothing new was created. */
  alreadyRegistered: boolean;
}

export interface CancelRegistrationResult {
  registration: MyRegistration;
  cancelled: boolean;
}

export interface WaitlistEntry {
  userId: string;
  displayName: string;
  email: string;
  joinedAt: string;
  status: WaitlistStatus;
}

export interface WaitlistResponse {
  entries: WaitlistEntry[];
  spotsLeft: number;
}

export interface RosterEntry {
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  participation: ParticipationState;
  checkedInAt: string | null;
  checkInMethod: CheckInMethod | null;
  checkedInByName: string | null;
  lateMinutes: number | null;
  chargeStatus: ChargeStatus | null;
  chargeAmountCents: number | null;
}

export interface RosterSummary {
  capacity: number;
  registered: number;
  checkedIn: number;
  active: number;
  notArrived: number;
  late: number;
  unpaid: number;
}

export interface RosterResponse {
  trip: {
    id: string;
    name: string;
    state: TripState;
    resortName: string;
    resortTimeZone: string;
    startsAt: string;
    sessionStartsAt: string;
    capacity: number;
  };
  summary: RosterSummary;
  entries: RosterEntry[];
}

export const rosterAddRequestSchema = z.object({
  userId: z.uuid(),
  allowOverCapacity: z.boolean().default(false),
});
export type RosterAddRequest = z.infer<typeof rosterAddRequestSchema>;

/** DELETE /admin/trips/:tripId/roster/:userId body. A reason is required. */
export const rosterRemoveRequestSchema = z.object({ reason: officerReason });
export type RosterRemoveRequest = z.infer<typeof rosterRemoveRequestSchema>;

/** POST /admin/trips/:tripId/checkins: an officer checks in a member who is physically present. */
export const officerCheckInRequestSchema = z.object({
  userId: z.uuid(),
  reason: officerReason,
  opId: z.uuid(),
});
export type OfficerCheckInRequest = z.infer<typeof officerCheckInRequestSchema>;

export interface OfficerCheckInResult {
  entry: RosterEntry;
  alreadyCheckedIn: boolean;
}

/** `details.reason` values the registration, waitlist, roster and check-in endpoints use. */
export const RegistrationErrorReason = {
  TRIP_FULL: 'TRIP_FULL',
  REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
  CANCEL_NOT_ALLOWED: 'CANCEL_NOT_ALLOWED',
  WAITLIST_NOT_ALLOWED: 'WAITLIST_NOT_ALLOWED',
  NOT_ON_ROSTER: 'NOT_ON_ROSTER',
  USE_ATTENDANCE_ACTIONS: 'USE_ATTENDANCE_ACTIONS',
  CHECK_IN_NOT_OPEN: 'CHECK_IN_NOT_OPEN',
  PARTICIPATION_NOT_ALLOWED: 'PARTICIPATION_NOT_ALLOWED',
  MEMBER_NOT_APPROVED: 'MEMBER_NOT_APPROVED',
} as const;
export type RegistrationErrorReason =
  (typeof RegistrationErrorReason)[keyof typeof RegistrationErrorReason];
