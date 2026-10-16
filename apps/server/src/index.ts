import { createApp } from './app';
import { env } from './config/env';
import { disconnectDatabase } from './db/prisma';
import { logger } from './lib/logger';

const app = createApp();
const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info({ port: env.PORT }, 'SnowSync server listening');
});

/** Stops accepting connections, then exits. */
function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void disconnectDatabase().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
