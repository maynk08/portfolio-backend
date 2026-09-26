import { randomUUID } from 'node:crypto';

import { pinoHttp } from 'pino-http';

import { logger } from '../lib/logger.js';

import type { IncomingMessage, ServerResponse } from 'node:http';

export const REQUEST_ID_HEADER = 'x-request-id';

// The CMS and portfolio servers may forward their own request ID so logs can be correlated across services.
// Anything that does not look like a plain ID is replaced, so it cannot be used to inject content into logs.
const INCOMING_REQUEST_ID_PATTERN = /^[\w-]{1,64}$/;

function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incomingId = req.headers[REQUEST_ID_HEADER];
  const requestId = typeof incomingId === 'string' && INCOMING_REQUEST_ID_PATTERN.test(incomingId) ? incomingId : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  return requestId;
}

const SERVER_ERROR_STATUS = 500;
const CLIENT_ERROR_STATUS = 400;

export const requestLogger = pinoHttp({
  logger,
  genReqId: resolveRequestId,
  customLogLevel: (_req, res, error) => {
    if (error !== undefined || res.statusCode >= SERVER_ERROR_STATUS) {
      return 'error';
    }
    if (res.statusCode >= CLIENT_ERROR_STATUS) {
      return 'warn';
    }
    return 'info';
  },
});
