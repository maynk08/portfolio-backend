import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { isStorageConfigured } from './lib/storage/index.js';
import { connectDatabase } from './loaders/database.js';
import { createApp } from './loaders/express.js';
import { startBackgroundJobs } from './loaders/jobs.js';
import { startServer } from './loaders/server.js';
import { registerShutdownHandlers } from './loaders/shutdown.js';
import { ensureDefaultContent } from './services/default-content.service.js';

async function main(): Promise<void> {
  await connectDatabase(config.mongodbUri);
  await ensureDefaultContent();
  const server = await startServer(createApp(), config.port);
  const stopBackgroundJobs = startBackgroundJobs();
  registerShutdownHandlers(server, stopBackgroundJobs);
  logger.info({ port: config.port, nodeEnv: config.nodeEnv, isMediaStorageConfigured: isStorageConfigured() }, 'Server listening');
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
