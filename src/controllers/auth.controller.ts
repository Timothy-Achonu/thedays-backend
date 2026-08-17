import type { Request, Response } from "express";

import { loginUser, registerUser, revokeSession } from "../services/auth.service.js";
import { getClearSessionCookieOptions, getSessionCookieOptions } from "../utils/auth-cookie.js";
import { SESSION_COOKIE_NAME } from "../utils/session.js";
import type { LoginInput, RegisterInput } from "../validators/auth.schemas.js";

export async function register(request: Request, response: Response): Promise<void> {
  const result = await registerUser(request.body as RegisterInput);

  response
    .status(201)
    .cookie(SESSION_COOKIE_NAME, result.sessionToken, getSessionCookieOptions(result.expiresAt))
    .json({ user: result.user });
}

export async function login(request: Request, response: Response): Promise<void> {
  const result = await loginUser(request.body as LoginInput);

  response
    .cookie(SESSION_COOKIE_NAME, result.sessionToken, getSessionCookieOptions(result.expiresAt))
    .json({ user: result.user });
}

export async function logout(request: Request, response: Response): Promise<void> {
  const sessionToken = request.cookies[SESSION_COOKIE_NAME] as string | undefined;

  if (sessionToken) {
    await revokeSession(sessionToken);
  }

  response.clearCookie(SESSION_COOKIE_NAME, getClearSessionCookieOptions()).status(204).send();
}

export function me(request: Request, response: Response): void {
  response.json({ user: request.auth!.user });
}
