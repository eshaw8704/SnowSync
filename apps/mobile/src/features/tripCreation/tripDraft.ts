import {
  createTripRequestSchema,
  GEOFENCE_RADIUS_DEFAULT_METERS,
  scheduleOrderIssues,
  tripBasicsSchema,
  tripRegistrationSchema,
  tripResortSchema,
  tripScheduleSchema,
  updateTripRequestSchema,
  type CreateTripRequest,
  type MemberSearchResult,
  type ResortName,
  type TripDetail,
  type TripTimeField,
  type UpdateTripRequest,
} from '@snowsync/shared';
import { fieldErrors } from '../forms/fieldErrors';

/**
 * Everything the officer has typed so far, before it is a valid request. Times are ISO strings
 * (null until chosen); capacity and cost are the text the officer typed, converted on submit.
 */
export interface TripDraft {
  name: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  resortName: ResortName | null;
  radiusMeters: number;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  capacityText: string;
  /** Dollars, as typed: "45" or "45.50". */
  costText: string;
  checkInStartsAt: string | null;
  sessionStartsAt: string | null;
  exitStartsAt: string | null;
  /** Initial roster (step 5). Not part of editing. */
  roster: MemberSearchResult[];
}

/** A blank wizard. */
export const EMPTY_DRAFT: TripDraft = {
  name: '',
  description: '',
  startsAt: null,
  endsAt: null,
  resortName: null,
  radiusMeters: GEOFENCE_RADIUS_DEFAULT_METERS,
  registrationOpensAt: null,
  registrationClosesAt: null,
  capacityText: '',
  costText: '',
  checkInStartsAt: null,
  sessionStartsAt: null,
  exitStartsAt: null,
  roster: [],
};

/** The six wizard steps (Figma catalog 09). */
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
export const WIZARD_STEP_COUNT = 6;

/** Shown after "Step N of 6 ·". */
export const STEP_SUBTITLES: Record<WizardStep, string> = {
  1: 'Basics',
  2: 'Resort boundary',
  3: 'Registration settings',
  4: 'Scheduled transitions',
  5: 'Trip-bound members only',
  6: 'Nothing is public until registration opens.',
};

/** Which step each field is entered on, so an error is shown where it was made. */
export const FIELD_STEP: Record<string, WizardStep> = {
  name: 1,
  description: 1,
  startsAt: 1,
  endsAt: 1,
  resortName: 2,
  radiusMeters: 2,
  registrationOpensAt: 3,
  registrationClosesAt: 3,
  capacity: 3,
  costCents: 3,
  checkInStartsAt: 4,
  sessionStartsAt: 4,
  exitStartsAt: 4,
  rosterUserIds: 5,
};

/** "24" → 24; anything that is not a whole number → NaN (the schema then explains). */
export function parseCapacity(text: string): number {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/** "45" → 4500, "45.5" → 4550, "$45.50" → 4550; anything else → NaN. */
export function parseCostCents(text: string): number {
  const trimmed = text.trim().replace(/^\$/, '');
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return Number.NaN;
  return Math.round(Number(trimmed) * 100);
}

/** The draft as request-shaped values (possibly still invalid). */
function toValues(draft: TripDraft) {
  return {
    name: draft.name,
    description: draft.description,
    startsAt: draft.startsAt ?? '',
    endsAt: draft.endsAt ?? '',
    resortName: draft.resortName ?? '',
    radiusMeters: draft.radiusMeters,
    registrationOpensAt: draft.registrationOpensAt ?? '',
    registrationClosesAt: draft.registrationClosesAt ?? '',
    capacity: parseCapacity(draft.capacityText),
    costCents: parseCostCents(draft.costText),
    checkInStartsAt: draft.checkInStartsAt ?? '',
    sessionStartsAt: draft.sessionStartsAt ?? '',
    exitStartsAt: draft.exitStartsAt ?? '',
    rosterUserIds: draft.roster.map((member) => member.id),
  };
}

const STEP_SCHEMAS = {
  1: tripBasicsSchema,
  2: tripResortSchema,
  3: tripRegistrationSchema,
  4: tripScheduleSchema,
} as const;

/** UI field names: capacity and cost errors belong to the text inputs the officer typed into. */
function toUiErrors(errors: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    const uiKey = key === 'capacity' ? 'capacityText' : key === 'costCents' ? 'costText' : key;
    result[uiKey] = message;
  }
  return result;
}

/**
 * Errors for one step, keyed by field: the step's shared schema plus any schedule-order rule whose
 * later field is on this step. Steps 5 and 6 have nothing of their own to validate.
 */
export function validateStep(step: WizardStep, draft: TripDraft): Record<string, string> {
  if (step === 5 || step === 6) return {};
  const values = toValues(draft);
  const parsed = STEP_SCHEMAS[step].safeParse(values);
  const errors = parsed.success ? {} : fieldErrors(parsed.error);
  for (const issue of scheduleOrderIssues(values as Partial<Record<TripTimeField, string>>)) {
    if (FIELD_STEP[issue.path] === step && !errors[issue.path]) {
      errors[issue.path] = issue.message;
    }
  }
  return toUiErrors(errors);
}

/** Validates steps 1 to 4 together; returns the first step with a problem (or null) and every error. */
export function validateConfiguration(draft: TripDraft): {
  firstInvalidStep: WizardStep | null;
  errors: Record<string, string>;
} {
  let firstInvalidStep: WizardStep | null = null;
  const errors: Record<string, string> = {};
  for (const step of [1, 2, 3, 4] as const) {
    const stepErrors = validateStep(step, draft);
    if (Object.keys(stepErrors).length > 0 && firstInvalidStep === null) {
      firstInvalidStep = step;
    }
    Object.assign(errors, stepErrors);
  }
  return { firstInvalidStep, errors };
}

/** POST /trips body from a draft that has passed validation. Throws if it is still invalid. */
export function draftToCreateRequest(draft: TripDraft): CreateTripRequest {
  return createTripRequestSchema.parse(toValues(draft));
}

/** PATCH /trips/:id body (no roster) with the version the officer loaded. */
export function draftToUpdateRequest(draft: TripDraft, version: number): UpdateTripRequest {
  const values: Partial<ReturnType<typeof toValues>> = toValues(draft);
  delete values.rosterUserIds;
  return updateTripRequestSchema.parse({ ...values, version });
}

/** Cents → the dollars text a cost field shows: 4500 → "45", 4550 → "45.50". */
export function centsToText(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** Starts the Edit trip screen from the saved trip (SS-136 reuses the wizard steps). */
export function tripDetailToDraft(trip: TripDetail): TripDraft {
  return {
    name: trip.name,
    description: trip.description,
    startsAt: trip.startsAt,
    endsAt: trip.endsAt,
    resortName: trip.resortName as ResortName,
    radiusMeters: trip.geofence.radiusMeters,
    registrationOpensAt: trip.registrationOpensAt,
    registrationClosesAt: trip.registrationClosesAt,
    capacityText: String(trip.capacity),
    costText: centsToText(trip.costCents),
    checkInStartsAt: trip.checkInStartsAt,
    sessionStartsAt: trip.sessionStartsAt,
    exitStartsAt: trip.exitStartsAt,
    roster: [],
  };
}

/**
 * Fills the lifecycle schedule from the trip day when it is still empty:
 * check-in 30 minutes before the start, active session at the start, ending at the end time.
 */
export function withDefaultSchedule(draft: TripDraft): TripDraft {
  if (!draft.startsAt || !draft.endsAt) return draft;
  const start = Date.parse(draft.startsAt);
  return {
    ...draft,
    checkInStartsAt: draft.checkInStartsAt ?? new Date(start - 30 * 60 * 1000).toISOString(),
    sessionStartsAt: draft.sessionStartsAt ?? draft.startsAt,
    exitStartsAt: draft.exitStartsAt ?? draft.endsAt,
  };
}
