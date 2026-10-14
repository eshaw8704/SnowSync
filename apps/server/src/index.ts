import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

const app = createApp();
const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info({ port: env.PORT }, 'SnowSync server listening');
});

/** Stops accepting connections, then exits. SS-104 part B also closes the database pool here. */
function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
