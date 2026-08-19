import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { env } from "../config/env.js";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1_000;
export const OTP_MAX_ATTEMPTS = 5;
export const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1_000;
export const STALE_UNVERIFIED_ACCOUNT_MS = 24 * 60 * 60 * 1_000;

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
}

export function hashOtp(otp: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(otp).digest("hex");
}

export function otpMatches(codeHash: string, otp: string): boolean {
  const providedHash = hashOtp(otp);
  const expected = Buffer.from(codeHash, "utf8");
  const provided = Buffer.from(providedHash, "utf8");

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

export function otpExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + OTP_TTL_MS);
}

export function isWithinResendCooldown(lastSentAt: Date | null | undefined, now = new Date()): boolean {
  if (!lastSentAt) {
    return false;
  }

  return now.getTime() - lastSentAt.getTime() < VERIFICATION_RESEND_COOLDOWN_MS;
}

export function isStaleUnverifiedAccount(createdAt: Date, now = new Date()): boolean {
  return now.getTime() - createdAt.getTime() >= STALE_UNVERIFIED_ACCOUNT_MS;
}
