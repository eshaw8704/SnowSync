import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../lib/logger';

/** Header used to pass a request id in and out. */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Logs every request with a request id. Reuses an incoming X-Request-Id header
 * or generates a UUID, and echoes the id back in the response header.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, id);
    return id;
  },
});
