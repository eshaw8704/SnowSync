import type { ApiFailure } from '@snowsync/shared';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/httpError';

/** True for errors from express.json() when it cannot read the body (bad JSON, too large). */
function isBodyParserError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    typeof err.type === 'string' &&
    'status' in err &&
    typeof err.status === 'number' &&
    err.status >= 400 &&
    err.status < 500
  );
}

/**
 * The last middleware. Converts any thrown error into the shared ApiError envelope.
 * Known errors keep their code; zod errors and unreadable request bodies become VALIDATION_FAILED; anything else becomes INTERNAL with a generic message.
 * Stack traces never reach the client.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  let status: number;
  let body: ApiFailure;

  if (err instanceof HttpError) {
    status = err.status;
    body = {
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'The request is not valid.',
        details: {
          issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
    };
  } else if (isBodyParserError(err)) {
    status = 400;
    body = {
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: 'The request body could not be read.' },
    };
  } else {
    status = 500;
    body = { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } };
  }

  if (status >= 500) {
    req.log.error({ err }, 'Unhandled error');
  } else {
    req.log.warn({ code: body.error.code }, body.error.message);
  }
  res.status(status).json(body);
};
