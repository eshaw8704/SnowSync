import { HTTP_STATUS_BY_ERROR_CODE, type ServerErrorCode } from '@snowsync/shared';

/**
 * Throw this from any route or service to send a specific API error.
 * The error handler turns it into { ok: false, error: { code, message, details } }.
 */
export class HttpError extends Error {
  readonly code: ServerErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ServerErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.status = HTTP_STATUS_BY_ERROR_CODE[code];
    this.details = details;
  }
}
