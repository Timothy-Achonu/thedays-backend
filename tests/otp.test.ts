import { describe, expect, it } from "vitest";

import {
  generateOtp,
  hashOtp,
  isStaleUnverifiedAccount,
  isWithinResendCooldown,
  OTP_LENGTH,
  otpExpiresAt,
  otpMatches,
  STALE_UNVERIFIED_ACCOUNT_MS,
  VERIFICATION_RESEND_COOLDOWN_MS,
} from "../src/utils/otp.js";

describe("otp helpers", () => {
  it("generates a 6-digit code", () => {
    const otp = generateOtp();

    expect(otp).toHaveLength(OTP_LENGTH);
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("hashes codes stably and compares them in constant time", () => {
    const otp = "123456";
    const codeHash = hashOtp(otp);

    expect(codeHash).toHaveLength(64);
    expect(codeHash).not.toContain(otp);
    expect(otpMatches(codeHash, otp)).toBe(true);
    expect(otpMatches(codeHash, "000000")).toBe(false);
  });

  it("expires codes after ten minutes", () => {
    const now = new Date("2026-08-19T12:00:00.000Z");

    expect(otpExpiresAt(now).toISOString()).toBe("2026-08-19T12:10:00.000Z");
  });

  it("enforces a 60-second resend cooldown after a successful send", () => {
    const lastSentAt = new Date("2026-08-19T12:00:00.000Z");

    expect(isWithinResendCooldown(lastSentAt, new Date("2026-08-19T12:00:59.000Z"))).toBe(true);
    expect(isWithinResendCooldown(lastSentAt, new Date(lastSentAt.getTime() + VERIFICATION_RESEND_COOLDOWN_MS))).toBe(
      false,
    );
    expect(isWithinResendCooldown(null)).toBe(false);
  });

  it("treats unverified accounts as stale after 24 hours", () => {
    const createdAt = new Date("2026-08-18T12:00:00.000Z");

    expect(isStaleUnverifiedAccount(createdAt, new Date("2026-08-19T11:59:59.000Z"))).toBe(false);
    expect(isStaleUnverifiedAccount(createdAt, new Date(createdAt.getTime() + STALE_UNVERIFIED_ACCOUNT_MS))).toBe(true);
  });
});
