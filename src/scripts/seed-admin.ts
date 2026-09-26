import { EnvValidationError } from '../config/env.js';
import { config } from '../config/index.js';
import { parseSeedEnv } from '../config/seed-env.js';
import { logger } from '../lib/logger.js';
import { connectDatabase, disconnectDatabase } from '../loaders/database.js';
import { setAdminCredentials } from '../services/admin.service.js';

import type { SeedConfig } from '../config/seed-env.js';

function loadSeedConfig(): SeedConfig {
  try {
    return parseSeedEnv(process.env);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

async function seedAdmin(): Promise<void> {
  const { adminEmail, adminPassword } = loadSeedConfig();

  await connectDatabase(config.mongodbUri);
  try {
    const result = await setAdminCredentials(adminEmail, adminPassword);
    logger.info(
      { email: adminEmail, result },
      result === 'created' ? 'Admin created' : 'Admin email and password updated, all sessions ended',
    );
  } finally {
    await disconnectDatabase();
  }
}

seedAdmin().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Admin seed failed');
  process.exit(1);
});
