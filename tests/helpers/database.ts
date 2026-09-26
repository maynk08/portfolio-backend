import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';

import { config } from '../../src/config/index.js';
import { connectDatabase, disconnectDatabase } from '../../src/loaders/database.js';

// Registers hooks that give every test an empty test database.
export function useTestDatabase(): void {
  beforeAll(async () => {
    if (!config.mongodbUri.includes('test')) {
      throw new Error('Refusing to run database tests against a non-test database');
    }
    await connectDatabase(config.mongodbUri);
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDatabase();
  });
}
