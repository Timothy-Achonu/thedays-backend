import type { NextFunction, Request, Response } from "express";

import { findAuthenticatedSession } from "../services/auth.service.js";
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

  const authenticatedUser = await findAuthenticatedSession(sessionToken);

  if (!authenticatedUser) {
    response.clearCookie(SESSION_COOKIE_NAME, getClearSessionCookieOptions());
    throw new AppError(401, "SESSION_EXPIRED", "Your session has expired. Please sign in again.");
  }

  request.auth = {
    user: authenticatedUser,
    sessionToken,
  };

  next();
}
