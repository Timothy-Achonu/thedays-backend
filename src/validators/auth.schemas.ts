import { z } from "zod";

import {
  isReservedUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "../utils/username.js";

function isSupportedTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email({ error: "Must be a valid email address" })
      .max(320, { error: "Email must be at most 320 characters" }),
  );

const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, { error: "Password must be at least 8 characters" })
  .max(128, { error: "Password must be at most 128 characters" });

const timezoneSchema = z
  .string()
  .trim()
  .max(100, { error: "Timezone must be at most 100 characters" })
  .refine(isSupportedTimeZone, {
    error: "Must be a valid IANA timezone (for example, Africa/Lagos)",
  });

const timezoneWithDefaultSchema = timezoneSchema.default("UTC");

const usernameSchema = z
  .string({ error: "Username is required" })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(USERNAME_MIN_LENGTH, { error: "Username must be at least 3 characters" })
      .max(USERNAME_MAX_LENGTH, { error: "Username must be at most 30 characters" })
      .regex(USERNAME_PATTERN, {
        error:
          "Username must start with a letter and contain only lowercase letters, numbers, and underscores",
      })
      .refine((value) => !isReservedUsername(value), {
        error: "This username is reserved",
      }),
  );

export const registerBodySchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    timezone: timezoneWithDefaultSchema,
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

const verificationCodeSchema = z
  .string({ error: "Verification code is required" })
  .trim()
  .regex(/^\d{6}$/, { error: "Verification code must be 6 digits" });

export const verifyEmailBodySchema = z
  .object({
    email: emailSchema,
    code: verificationCodeSchema,
  })
  .strict();

export const resendVerificationBodySchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const googleAuthBodySchema = z
  .object({
    idToken: z
      .string({ error: "Google ID token is required" })
      .trim()
      .min(1, { error: "Google ID token is required" })
      .max(4096, { error: "Google ID token is too long" }),
    timezone: timezoneWithDefaultSchema,
  })
  .strict();

export const updateCurrentUserBodySchema = z
  .object({
    timezone: timezoneSchema,
  })
  .strict();

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailBodySchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationBodySchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthBodySchema>;
export type UpdateCurrentUserInput = z.infer<typeof updateCurrentUserBodySchema>;
