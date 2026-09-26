import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Integration test files share one MongoDB test database, so they must not run at the same time.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      MONGODB_URI: 'mongodb://localhost:27017/portfolio-test',
      LOG_LEVEL: 'silent',
      JWT_SECRET: 'test-only-secret-that-is-at-least-32-characters-long',
    },
  },
});
