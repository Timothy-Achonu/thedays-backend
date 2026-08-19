import { OAuth2Client } from "google-auth-library";

import { env } from "../config/env.js";
import { AppError } from "./app-error.js";

export interface GoogleIdentity {
  googleSub: string;
  email: string;
  givenName?: string;
  familyName?: string;
}

const googleOAuthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function invalidGoogleTokenError(): AppError {
  return new AppError(401, "INVALID_GOOGLE_TOKEN", "Google sign-in failed. Please try again.");
}

function isEmailVerified(value: boolean | undefined): boolean {
  return value === true;
}

function logGoogleTokenVerificationFailure(error: unknown): void {
  if (env.NODE_ENV === "development") {
    console.error("Google ID token verification failed", error);
  }
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !isEmailVerified(payload.email_verified)) {
      logGoogleTokenVerificationFailure({
        reason: "payload_rejected",
        hasSub: Boolean(payload?.sub),
        hasEmail: Boolean(payload?.email),
        emailVerified: payload?.email_verified ?? null,
      });
      throw invalidGoogleTokenError();
    }

    const identity: GoogleIdentity = {
      googleSub: payload.sub,
      email: payload.email.trim().toLowerCase(),
    };

    if (payload.given_name) {
      identity.givenName = payload.given_name;
    }

    if (payload.family_name) {
      identity.familyName = payload.family_name;
    }

    return identity;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logGoogleTokenVerificationFailure(error);
    throw invalidGoogleTokenError();
  }
}
