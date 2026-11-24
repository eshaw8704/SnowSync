import { pino } from 'pino';
import { env } from '../config/env';

/** The one structured logger for the whole server. Never use console.* directly. */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      // Redirects can carry one-time credentials (the SSO callback's ?code=…).
      'res.headers.location',
    ],
    censor: '[redacted]',
  },
  ...(env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
});
