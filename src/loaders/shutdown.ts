import { disconnectDatabase } from './database.js';
import { stopServer } from './server.js';
import { logger } from '../lib/logger.js';

import type { Server } from 'node:http';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

let isShuttingDown = false;

async function shutdown(server: Server, reason: string, exitCode: number): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  logger.info({ reason }, 'Shutting down');

  const forceExitTimer = setTimeout(() => {
    logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Graceful shutdown timed out, forcing exit');
    server.closeAllConnections();
    process.exit(EXIT_FAILURE);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  let finalExitCode = exitCode;
  try {
    await stopServer(server);
    await disconnectDatabase();
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
    finalExitCode = EXIT_FAILURE;
  }

  clearTimeout(forceExitTimer);
  logger.info({ exitCode: finalExitCode }, 'Shutdown complete');
  process.exit(finalExitCode);
}

export function registerShutdownHandlers(server: Server): void {
  // `shutdown` catches its own errors and always ends in process.exit, so its promise never rejects.
  process.on('SIGTERM', () => void shutdown(server, 'SIGTERM', EXIT_SUCCESS));
  process.on('SIGINT', () => void shutdown(server, 'SIGINT', EXIT_SUCCESS));

  // Last-resort safety net: the process state is unknown, so log and shut down rather than keep serving.
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    void shutdown(server, 'unhandledRejection', EXIT_FAILURE);
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    void shutdown(server, 'uncaughtException', EXIT_FAILURE);
  });
}
