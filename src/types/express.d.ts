import type { AdminProfile } from './admin.types.js';

declare global {
  namespace Express {
    interface Request {
      // Set by the auth middleware; read it through `getAuthenticatedAdmin`.
      admin?: AdminProfile;
    }
  }
}

export {};
