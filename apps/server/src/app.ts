import express, { type Express } from 'express';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';
import { healthRouter } from './modules/health/healthRoutes';

/**
 * Builds the Express app without starting a listener, so tests can use it directly.
 * Order: request logging -> body parsing -> module routers -> not-found -> error handler.
 * Request logging runs first so req.log exists even when the body cannot be parsed.
 */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));

  // Module routers. Later sprints add one line per module here.
  app.use(healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
