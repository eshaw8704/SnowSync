import type { ZodError } from 'zod';

/**
 * Turns a zod validation error into `{ fieldName: firstMessage }` for inline TextField errors.
 * Works for client-side `safeParse` results and for the server's VALIDATION_FAILED details,
 * because both use the same shared schemas and messages.
 */
export function fieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (key && !Object.hasOwn(result, key)) {
      result[key] = issue.message;
    }
  }
  return result;
}

/** Same as {@link fieldErrors} for the `details.issues` array of a server VALIDATION_FAILED error. */
export function serverFieldErrors(
  details: Record<string, unknown> | undefined,
): Record<string, string> {
  const issues = Array.isArray(details?.issues)
    ? (details.issues as ({ path?: unknown; message?: unknown } | null)[])
    : [];
  const result: Record<string, string> = {};
  for (const issue of issues) {
    if (
      typeof issue?.path === 'string' &&
      typeof issue.message === 'string' &&
      !Object.hasOwn(result, issue.path)
    ) {
      result[issue.path] = issue.message;
    }
  }
  return result;
}
