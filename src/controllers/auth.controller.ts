import type { Request, Response } from "express";

import {
  loginUser,
  loginWithGoogle,
  registerUser,
  resendVerificationEmail,
  revokeSession,
  verifyUserEmail,
} from "../services/auth.service.js";
import { getClearSessionCookieOptions, getSessionCookieOptions } from "../utils/auth-cookie.js";
import { SESSION_COOKIE_NAME } from "../utils/session.js";
import type {
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from "../validators/auth.schemas.js";

export async function register(request: Request, response: Response): Promise<void> {
  const result = await registerUser(request.body as RegisterInput);

  response.status(201).json({
    email: result.email,
    requiresVerification: true,
  });
}

export async function verifyEmail(request: Request, response: Response): Promise<void> {
  const result = await verifyUserEmail(request.body as VerifyEmailInput);

  response
    .cookie(SESSION_COOKIE_NAME, result.sessionToken, getSessionCookieOptions(result.expiresAt))
    .json({ user: result.user });
}

export async function resendVerification(request: Request, response: Response): Promise<void> {
  await resendVerificationEmail(request.body as ResendVerificationInput);
  response.status(204).send();
}

export async function login(request: Request, response: Response): Promise<void> {
  const result = await loginUser(request.body as LoginInput);

  response
    .cookie(SESSION_COOKIE_NAME, result.sessionToken, getSessionCookieOptions(result.expiresAt))
    .json({ user: result.user });
}

export async function googleLogin(request: Request, response: Response): Promise<void> {
  const result = await loginWithGoogle(request.body as GoogleAuthInput);

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
