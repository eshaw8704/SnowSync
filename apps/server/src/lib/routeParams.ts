import { z } from 'zod';
import { HttpError } from './httpError';

/** Parses a :tripId route parameter. A malformed id is a trip we can't find (404), not a 400. */
export function parseTripId(raw: unknown): string {
  const tripId = z.uuid().safeParse(raw);
  if (!tripId.success) {
    throw new HttpError('NOT_FOUND', "We can't find this trip.");
  }
  return tripId.data;
}

/** Parses a :userId route parameter. A malformed id is a member we can't find (404). */
export function parseUserId(raw: unknown): string {
  const userId = z.uuid().safeParse(raw);
  if (!userId.success) {
    throw new HttpError('NOT_FOUND', "We can't find this member.");
  }
  return userId.data;
}
