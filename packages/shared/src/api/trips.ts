import { z } from 'zod';
import type { ParticipationState } from '../domain/participationState';
import { TripState } from '../domain/tripState';
import type { UserRole } from '../domain/userRole';

/** One resort the club travels to. The geofence for automatic check-in is centered on its base lodge. */
export interface Resort {
  name: string;
  /** Where members meet, as shown in "Resort boundary · 500 m around base lodge". */
  baseLodgeLabel: string;
  latitude: number;
  longitude: number;
  /** IANA time zone. Trip times are stored in UTC and shown in this zone. */
  timeZone: string;
}

/**
 * The resorts the club travels to (Figma catalog 09, step 2). Coordinates are the resort's
 * published point (Wikipedia infobox, checked Nov 2026) and MUST be moved onto the base lodge and
 * verified on a map before automatic check-in uses them in Sprint 6. Never guess coordinates.
 */
export const RESORTS = [
  {
    name: 'Palisades Tahoe',
    baseLodgeLabel: 'base lodge',
    latitude: 39.196,
    longitude: -120.235,
    timeZone: 'America/Los_Angeles',
  },
  {
    name: 'Northstar California',
    baseLodgeLabel: 'base lodge',
    latitude: 39.264,
    longitude: -120.125,
    timeZone: 'America/Los_Angeles',
  },
  {
    name: 'Heavenly',
    baseLodgeLabel: 'base lodge',
    latitude: 38.9353,
    longitude: -119.94,
    timeZone: 'America/Los_Angeles',
  },
  {
    name: 'Sugar Bowl',
    baseLodgeLabel: 'base lodge',
    latitude: 39.30444,
    longitude: -120.33583,
    timeZone: 'America/Los_Angeles',
  },
  {
    name: 'Boreal',
    baseLodgeLabel: 'base lodge',
    latitude: 39.3317,
    longitude: -120.3511,
    timeZone: 'America/Los_Angeles',
  },
] as const satisfies readonly Resort[];

/** One of the resort names in {@link RESORTS}. */
export type ResortName = (typeof RESORTS)[number]['name'];

/** Every resort name, in list order. */
export const RESORT_NAMES = RESORTS.map((resort) => resort.name) as [ResortName, ...ResortName[]];

/** The resort with this name, or undefined. */
export function findResort(name: string): Resort | undefined {
  return RESORTS.find((resort) => resort.name === name);
}

/** Limits from the Sprint 3 Jira subtasks. */
export const TRIP_NAME_MIN_LENGTH = 3;
export const TRIP_NAME_MAX_LENGTH = 80;
export const TRIP_CAPACITY_MAX = 200;
export const TRIP_COST_MAX_CENTS = 100_000;
export const GEOFENCE_RADIUS_MIN_METERS = 100;
export const GEOFENCE_RADIUS_MAX_METERS = 2000;
export const GEOFENCE_RADIUS_DEFAULT_METERS = 500;
export const MEMBER_SEARCH_LIMIT = 25;

const isoInstant = z.iso.datetime({ offset: true, message: 'Choose a date and time.' });

/** Step 1 (Basics): name, description, and when the trip day starts and ends. */
export const tripBasicsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(TRIP_NAME_MIN_LENGTH, { message: `Use at least ${TRIP_NAME_MIN_LENGTH} characters.` })
    .max(TRIP_NAME_MAX_LENGTH, { message: `Use ${TRIP_NAME_MAX_LENGTH} characters or fewer.` }),
  description: z.string().trim().max(1000, { message: 'Use 1000 characters or fewer.' }),
  startsAt: isoInstant,
  endsAt: isoInstant,
});

/** Step 2 (Resort and geofence). */
export const tripResortSchema = z.object({
  resortName: z.enum(RESORT_NAMES, { message: 'Choose a resort.' }),
  radiusMeters: z
    .number()
    .int()
    .min(GEOFENCE_RADIUS_MIN_METERS, { message: `Use at least ${GEOFENCE_RADIUS_MIN_METERS} m.` })
    .max(GEOFENCE_RADIUS_MAX_METERS, { message: `Use ${GEOFENCE_RADIUS_MAX_METERS} m or less.` }),
});

/** Step 3 (Registration settings). */
export const tripRegistrationSchema = z.object({
  registrationOpensAt: isoInstant,
  registrationClosesAt: isoInstant,
  capacity: z
    .number({ message: 'Enter how many members can join.' })
    .int({ message: 'Use a whole number.' })
    .min(1, { message: 'At least 1 member.' })
    .max(TRIP_CAPACITY_MAX, { message: `At most ${TRIP_CAPACITY_MAX} members.` }),
  costCents: z
    .number({ message: 'Enter the cost per member.' })
    .int({ message: 'Use whole cents.' })
    .min(0, { message: 'Cost cannot be negative.' })
    .max(TRIP_COST_MAX_CENTS, { message: 'At most $1,000 per member.' }),
});

/** Step 4 (Lifecycle schedule). Registration opening is set on step 3 and shown again here. */
export const tripScheduleSchema = z.object({
  checkInStartsAt: isoInstant,
  sessionStartsAt: isoInstant,
  exitStartsAt: isoInstant,
});

/** Step 5 (Initial roster): approved members pre-added as REGISTERED. */
export const tripRosterSchema = z.object({
  rosterUserIds: z
    .array(z.uuid())
    .max(TRIP_CAPACITY_MAX)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'A member is listed twice.' }),
});

/** Every time field of a trip, in the order they must happen. */
export type TripTimeField =
  | 'startsAt'
  | 'endsAt'
  | 'registrationOpensAt'
  | 'registrationClosesAt'
  | 'checkInStartsAt'
  | 'sessionStartsAt'
  | 'exitStartsAt';

/** One broken ordering rule, reported on the later field so the wizard shows it on the right step. */
export interface ScheduleOrderIssue {
  path: TripTimeField;
  message: string;
}

/**
 * The ordering rules from SS-125: registrationOpensAt < registrationClosesAt <= checkInStartsAt <
 * sessionStartsAt < exitStartsAt, plus startsAt < endsAt. Fields that are missing or not valid
 * instants are skipped (their own schema reports them).
 */
export function scheduleOrderIssues(
  values: Partial<Record<TripTimeField, string | null | undefined>>,
): ScheduleOrderIssue[] {
  const time = (field: TripTimeField): number | null => {
    const value = values[field];
    if (!value) return null;
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  };
  const rules: [TripTimeField, TripTimeField, 'lt' | 'lte', string][] = [
    ['startsAt', 'endsAt', 'lt', 'The trip must end after it starts.'],
    [
      'registrationOpensAt',
      'registrationClosesAt',
      'lt',
      'The deadline must be after registration opens.',
    ],
    [
      'registrationClosesAt',
      'checkInStartsAt',
      'lte',
      'Check-in cannot start before the registration deadline.',
    ],
    ['checkInStartsAt', 'sessionStartsAt', 'lt', 'The active session must start after check-in.'],
    ['sessionStartsAt', 'exitStartsAt', 'lt', 'Ending must begin after the active session starts.'],
  ];
  const issues: ScheduleOrderIssue[] = [];
  for (const [earlier, later, op, message] of rules) {
    const a = time(earlier);
    const b = time(later);
    if (a === null || b === null) continue;
    if (op === 'lt' ? !(a < b) : !(a <= b)) {
      issues.push({ path: later, message });
    }
  }
  return issues;
}

/** The trip configuration shared by create and edit: steps 1 to 4 together. */
const tripConfigurationShape = tripBasicsSchema
  .extend(tripResortSchema.shape)
  .extend(tripRegistrationSchema.shape)
  .extend(tripScheduleSchema.shape);

function withScheduleOrder<T extends z.ZodType<Partial<Record<TripTimeField, string>>>>(
  schema: T,
): T {
  return schema.superRefine((value, ctx) => {
    for (const issue of scheduleOrderIssues(value)) {
      ctx.addIssue({ code: 'custom', path: [issue.path], message: issue.message });
    }
  });
}

/** POST /trips (officers with MANAGE_TRIPS). Saves a CREATED trip with its geofence and roster. */
export const createTripRequestSchema = withScheduleOrder(
  tripConfigurationShape.extend(tripRosterSchema.shape),
);
export type CreateTripRequest = z.infer<typeof createTripRequestSchema>;

/**
 * PATCH /trips/:id: the full configuration plus the `version` the officer loaded. The roster is
 * not edited here; roster changes arrive with registration in Sprint 4.
 */
export const updateTripRequestSchema = withScheduleOrder(
  tripConfigurationShape.extend({ version: z.number().int().min(1) }),
);
export type UpdateTripRequest = z.infer<typeof updateTripRequestSchema>;

/** POST /trips/:id/transitions (officer override). */
export const transitionRequestSchema = z.object({
  fromState: z.enum(TripState),
  toState: z.enum(TripState),
  /** Client-generated id; repeating it never changes anything twice. */
  opId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(3, { message: 'Explain why in a few words.' })
    .max(500, { message: 'Use 500 characters or fewer.' })
    .optional(),
});
export type TransitionRequest = z.infer<typeof transitionRequestSchema>;

/** Response of POST /trips/:id/transitions. `applied: false` means someone else moved it first. */
export interface TransitionResponse {
  applied: boolean;
  currentState: TripState;
  version: number;
}

/** GET /trips?scope=… */
export const TRIP_LIST_SCOPES = ['available', 'mine', 'past', 'created'] as const;
export type TripListScope = (typeof TRIP_LIST_SCOPES)[number];

/** One row of GET /trips. Trip phase and my participation are separate fields, always. */
export interface TripSummary {
  id: string;
  name: string;
  resortName: string;
  resortTimeZone: string;
  /** ISO 8601 instants. */
  startsAt: string;
  endsAt: string;
  state: TripState;
  capacity: number;
  /** Members with a REGISTERED or later participation. */
  registeredCount: number;
  costCents: number;
  /** NOT_REGISTERED when the viewer has no trip membership. */
  myParticipation: ParticipationState;
}

/** Trip geofence: the circle automatic check-in uses in Sprint 6. */
export interface TripGeofence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  label: string;
}

/** A trip officer shown on trip detail: the creator and any roster member who is an officer or above. */
export interface TripOfficer {
  id: string;
  displayName: string;
  role: UserRole;
}

/** GET /trips/:id, and the body of create and edit responses. */
export interface TripDetail extends TripSummary {
  description: string;
  /** Starts at 1 and increases on every edit or transition; PATCH must send the one it loaded. */
  version: number;
  registrationOpensAt: string;
  registrationClosesAt: string;
  checkInStartsAt: string;
  sessionStartsAt: string;
  exitStartsAt: string;
  geofence: TripGeofence;
  officers: TripOfficer[];
}

/** Response of PATCH /trips/:id. */
export interface UpdateTripResponse {
  trip: TripDetail;
  /** True when the trip was already visible to members, so a trip update may need announcing. */
  wasPublished: boolean;
}

/** One row of GET /admin/members/search. */
export interface MemberSearchResult {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

/** `details.reason` values the trip endpoints use. */
export const TripErrorReason = {
  STALE_VERSION: 'STALE_VERSION',
  TRIP_NOT_EDITABLE: 'TRIP_NOT_EDITABLE',
  DELETE_NOT_ALLOWED: 'DELETE_NOT_ALLOWED',
  ROSTER_MEMBER_NOT_APPROVED: 'ROSTER_MEMBER_NOT_APPROVED',
  TRANSITION_NOT_ALLOWED: 'TRANSITION_NOT_ALLOWED',
  REASON_REQUIRED: 'REASON_REQUIRED',
} as const;
export type TripErrorReason = (typeof TripErrorReason)[keyof typeof TripErrorReason];
