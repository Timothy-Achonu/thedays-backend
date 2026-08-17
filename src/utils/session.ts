import { createHmac, randomBytes } from "node:crypto";

import { env } from "../config/env.js";

export const SESSION_COOKIE_NAME = "thedays_session";

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}

export function createSessionExpiry(now = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + env.SESSION_TTL_DAYS);
  return expiresAt;
}
