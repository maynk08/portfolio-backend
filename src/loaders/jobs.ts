import { logger } from '../lib/logger.js';
import { deleteStalePendingMedia } from '../services/media.service.js';

const STALE_MEDIA_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

async function runStaleMediaCleanup(): Promise<void> {
  try {
    const deletedCount = await deleteStalePendingMedia();
    if (deletedCount > 0) {
      logger.info({ deletedCount }, 'Deleted abandoned uploads');
    }
  } catch (error) {
    // A failed run is retried on the next interval; it must not take the server down.
    logger.error({ err: error }, 'Abandoned upload cleanup failed');
  }
}

// Starts recurring maintenance work and returns a function that stops it.
export function startBackgroundJobs(): () => void {
  void runStaleMediaCleanup();
  const cleanupTimer = setInterval(() => void runStaleMediaCleanup(), STALE_MEDIA_CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
  return () => {
    clearInterval(cleanupTimer);
  };
}
