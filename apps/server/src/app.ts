import express, { type Express } from 'express';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';
import { healthRouter } from './modules/health/healthRoutes';

/**
 * Builds the Express app without starting a listener, so tests can use it directly.
 * Order: body parsing -> request logging -> module routers -> not-found -> error handler.
 */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger);

  // Module routers. Later sprints add one line per module here.
  app.use(healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
