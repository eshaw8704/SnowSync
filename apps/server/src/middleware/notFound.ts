import type { RequestHandler } from 'express';
import { HttpError } from '../lib/httpError';

/** Runs after every router: any request that reached here matched no route. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError('NOT_FOUND', `No route for ${req.method} ${req.path}`));
};
