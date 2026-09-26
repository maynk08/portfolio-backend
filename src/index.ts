import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { connectDatabase } from './loaders/database.js';
import { createApp } from './loaders/express.js';
import { startServer } from './loaders/server.js';
import { registerShutdownHandlers } from './loaders/shutdown.js';

async function main(): Promise<void> {
  await connectDatabase(config.mongodbUri);
  const server = await startServer(createApp(), config.port);
  registerShutdownHandlers(server);
  logger.info({ port: config.port, nodeEnv: config.nodeEnv }, 'Server listening');
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
