import { errors, jwtVerify, SignJWT } from 'jose';

import { config } from '../config/index.js';

const ALGORITHM = 'HS256';
const ISSUER = 'portfolio-backend';
const AUDIENCE = 'portfolio-cms';
const TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const MS_PER_SECOND = 1000;

const secretKey = new TextEncoder().encode(config.jwtSecret);

export interface AccessTokenClaims {
  adminId: string;
  sessionVersion: number;
}

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

export class InvalidTokenError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Access token is invalid or expired', options);
    this.name = 'InvalidTokenError';
  }
}

export async function issueAccessToken(claims: AccessTokenClaims): Promise<IssuedToken> {
  const issuedAtSeconds = Math.floor(Date.now() / MS_PER_SECOND);
  const expiresAtSeconds = issuedAtSeconds + TOKEN_LIFETIME_SECONDS;

  const token = await new SignJWT({ sv: claims.sessionVersion })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.adminId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(expiresAtSeconds)
    .sign(secretKey);

  return { token, expiresAt: new Date(expiresAtSeconds * MS_PER_SECOND) };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: [ALGORITHM], issuer: ISSUER, audience: AUDIENCE });
    const { sub, sv } = payload;
    if (typeof sub !== 'string' || typeof sv !== 'number') {
      throw new InvalidTokenError();
    }
    return { adminId: sub, sessionVersion: sv };
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      throw error;
    }
    if (error instanceof errors.JOSEError) {
      throw new InvalidTokenError({ cause: error });
    }
    throw error;
  }
}
