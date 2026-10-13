/**
 * Every error code the SnowSync API contract knows about.
 *
 * Server codes are sent in the `error.code` field of a failed response.
 * `NETWORK_ERROR` and `TIMEOUT` are client-only: the mobile API client creates them
 * when no response arrives. The server never sends them.
 */
export const API_ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL',
  'NETWORK_ERROR',
  'TIMEOUT',
] as const;

/** One of the {@link API_ERROR_CODES}. */
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Codes the server is allowed to send. */
export type ServerErrorCode = Exclude<ApiErrorCode, 'NETWORK_ERROR' | 'TIMEOUT'>;

/** Codes only the mobile client creates. */
export type ClientErrorCode = Extract<ApiErrorCode, 'NETWORK_ERROR' | 'TIMEOUT'>;

/**
 * The single error shape used by both apps.
 *
 * Business conflicts use `code: 'CONFLICT'` and name the reason in `details.reason`
 * (for example `TRIP_FULL`, `CHAT_CLOSED`, `OPERATION_IN_PROGRESS`).
 */
export interface ApiError {
  /** Machine-readable error code. */
  code: ApiErrorCode;
  /** Human-readable message that is safe to show to a user. Never contains a stack trace. */
  message: string;
  /** Optional structured data, such as field validation issues or a conflict reason. */
  details?: Record<string, unknown>;
}

/** The HTTP status the server uses for each server error code. */
export const HTTP_STATUS_BY_ERROR_CODE: Record<ServerErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/** Returns true when `value` is one of the known {@link ApiErrorCode} strings. */
export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && (API_ERROR_CODES as readonly string[]).includes(value);
}