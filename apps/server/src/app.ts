import express, { type Express } from 'express';
import { requestLogger } from './middleware/requestLogger';

/**
 * Builds the Express app without starting a listener, so tests can use it directly.
 * Order: body parsing -> request logging -> module routers -> not-found -> error handler.
 */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger);

  // Module routers are mounted here. SS-104 part B adds health, not-found and the error handler.

  return app;
}
