import { createApp } from './app';
import { env } from './config/env';
import { disconnectDatabase } from './db/prisma';
import { logger } from './lib/logger';
import { startScheduler, stopScheduler } from './modules/trips/scheduler';

const app = createApp();
const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info({ port: env.PORT }, 'SnowSync server listening');
  startScheduler();
});

let shuttingDown = false;

/**
 * Stops accepting connections, lets in-flight requests and a running Scheduler tick finish, then
 * closes the database and exits. A second signal (SIGTERM then Ctrl+C) is ignored.
 */
function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  const schedulerStopped = stopScheduler();
  server.close(() => {
    void schedulerStopped.then(() => disconnectDatabase()).finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
