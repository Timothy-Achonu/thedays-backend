import { z } from "zod";

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

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "help",
  "me",
  "null",
  "support",
  "system",
  "thedays",
  "undefined",
]);

const usernameSchema = z
  .string({ error: "Username is required" })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(3, { error: "Username must be at least 3 characters" })
      .max(30, { error: "Username must be at most 30 characters" })
      .regex(/^[a-z][a-z0-9_]*$/, {
        error:
          "Username must start with a letter and contain only lowercase letters, numbers, and underscores",
      })
      .refine((value) => !RESERVED_USERNAMES.has(value), {
        error: "This username is reserved",
      }),
  );

export const registerBodySchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    timezone: z
      .string()
      .trim()
      .max(100, { error: "Timezone must be at most 100 characters" })
      .refine(isSupportedTimeZone, {
        error: "Must be a valid IANA timezone (for example, Africa/Lagos)",
      })
      .default("UTC"),
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
