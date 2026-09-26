import { EnvValidationError, parseEnv } from './env.js';

import type { Config } from './env.js';

function loadConfig(): Config {
  try {
    return parseEnv(process.env);
  } catch (error) {
    if (!(error instanceof EnvValidationError)) {
      throw error;
    }
    // The logger is configured from this config, so it cannot be used to report that the config is invalid.
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

export const config = loadConfig();
