import mongoose from 'mongoose';

import { logger } from '../lib/logger.js';

const SERVER_SELECTION_TIMEOUT_MS = 5_000;
const SOCKET_TIMEOUT_MS = 30_000;

// Reject unknown fields in query filters, and neutralise `$`-operators smuggled in through filter values.
mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

let isClosingIntentionally = false;

mongoose.connection.on('disconnected', () => {
  if (!isClosingIntentionally) {
    logger.warn('MongoDB disconnected');
  }
});
mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});
mongoose.connection.on('error', (error: unknown) => {
  logger.error({ err: error }, 'MongoDB connection error');
});

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    socketTimeoutMS: SOCKET_TIMEOUT_MS,
  });
  logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
}

export async function disconnectDatabase(): Promise<void> {
  isClosingIntentionally = true;
  await mongoose.disconnect();
  logger.info('MongoDB connection closed');
}
