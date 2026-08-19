import type { NextFunction, Request, Response } from "express";

import { findAuthenticatedSession, revokeSession } from "../services/auth.service.js";
import { AppError } from "../utils/app-error.js";
import { getClearSessionCookieOptions } from "../utils/auth-cookie.js";
import { SESSION_COOKIE_NAME } from "../utils/session.js";

export async function requireAuthentication(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const sessionToken = request.cookies[SESSION_COOKIE_NAME] as string | undefined;

  if (!sessionToken) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  const authenticatedSession = await findAuthenticatedSession(sessionToken);

  if (!authenticatedSession) {
    response.clearCookie(SESSION_COOKIE_NAME, getClearSessionCookieOptions());
    throw new AppError(401, "SESSION_EXPIRED", "Your session has expired. Please sign in again.");
  }

  if (!authenticatedSession.isEmailVerified) {
    await revokeSession(sessionToken);
    response.clearCookie(SESSION_COOKIE_NAME, getClearSessionCookieOptions());
    throw new AppError(403, "EMAIL_NOT_VERIFIED", "Verify your email before continuing");
  }

  request.auth = {
    user: authenticatedSession.user,
    sessionToken,
  };

  next();
}
