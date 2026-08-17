import { z } from "zod";

function isSupportedTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(320));
const passwordSchema = z.string().min(8).max(128);

export const registerBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: emailSchema,
    password: passwordSchema,
    timezone: z.string().trim().max(100).refine(isSupportedTimeZone, "Invalid IANA timezone").default("UTC"),
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
