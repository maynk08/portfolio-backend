import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';

import { config } from '../../src/config/index.js';
import { connectDatabase, disconnectDatabase } from '../../src/loaders/database.js';
import { ensureDefaultContent } from '../../src/services/default-content.service.js';

// Registers hooks that give every test a clean test database with the default content in place.
// Collections are emptied rather than dropped so unique indexes stay in place.
export function useTestDatabase(): void {
  beforeAll(async () => {
    if (!config.mongodbUri.includes('test')) {
      throw new Error('Refusing to run database tests against a non-test database');
    }
    await connectDatabase(config.mongodbUri);
    await mongoose.connection.syncIndexes();
  });

  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
    await ensureDefaultContent();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDatabase();
  });
}
