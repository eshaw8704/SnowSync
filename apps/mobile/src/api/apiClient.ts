import type { ApiError, ApiErrorCode, ApiResponse } from '@snowsync/shared';
import { isApiErrorCode } from '@snowsync/shared';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';

/** HTTP methods the client supports. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** The only error type {@link apiRequest} throws. Carries the shared {@link ApiError} fields. */
export class ApiClientError extends Error implements ApiError {
  readonly code: ApiErrorCode;
  readonly details: Record<string, unknown> | undefined;
  /** HTTP status when a response arrived; undefined for NETWORK_ERROR and TIMEOUT. */
  readonly status: number | undefined;

  constructor(error: ApiError, status?: number) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.details = error.details;
    this.status = status;
  }
}

/** Options for {@link apiRequest}. */
export interface ApiRequestOptions {
  /** JSON body for POST, PUT and PATCH. */
  body?: unknown;
  /** Overrides REQUEST_TIMEOUT_MS for this call. */
  timeoutMs?: number;
}

/**
 * Sends one request to the SnowSync server and returns the `data` of a successful envelope.
 * Success is decided by the envelope's `ok` field, not the HTTP status
 * (GET /health answers 503 with `ok: true` when the database is down).
 *
 * @throws {ApiClientError} with code TIMEOUT, NETWORK_ERROR, a server code, or INTERNAL for a
 * response that is not a SnowSync envelope.
 */
export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new ApiClientError({
        code: 'TIMEOUT',
        message: 'The server took too long to respond.',
      });
    }
    throw new ApiClientError({ code: 'NETWORK_ERROR', message: 'Could not reach the server.' });
  } finally {
    clearTimeout(timer);
  }

  let envelope: unknown;
  try {
    envelope = await response.json();
  } catch {
    throw new ApiClientError(
      { code: 'INTERNAL', message: 'The server sent a response the app could not read.' },
      response.status,
    );
  }

  if (isEnvelope<T>(envelope)) {
    if (envelope.ok) {
      return envelope.data;
    }
    throw new ApiClientError(envelope.error, response.status);
  }
  throw new ApiClientError(
    { code: 'INTERNAL', message: 'The server sent a response the app could not read.' },
    response.status,
  );
}

/** True when `value` has the shape of a SnowSync {@link ApiResponse}. */
function isEnvelope<T>(value: unknown): value is ApiResponse<T> {
  if (typeof value !== 'object' || value === null || !('ok' in value)) return false;
  if (value.ok === true) return 'data' in value;
  if (value.ok === false && 'error' in value) {
    const error = value.error as { code?: unknown; message?: unknown } | null;
    return error !== null && isApiErrorCode(error.code) && typeof error.message === 'string';
  }
  return false;
}
