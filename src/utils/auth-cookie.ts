import type { CookieOptions } from "express";

import { env } from "../config/env.js";

const sharedCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: env.COOKIE_SAME_SITE,
  secure: env.NODE_ENV === "production",
  path: "/",
};

export function getSessionCookieOptions(expiresAt: Date): CookieOptions {
  return {
    ...sharedCookieOptions,
    expires: expiresAt,
  };
}

export function getClearSessionCookieOptions(): CookieOptions {
  return sharedCookieOptions;
}
