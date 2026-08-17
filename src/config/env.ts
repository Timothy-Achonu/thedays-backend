import "dotenv/config";

import { z } from "zod";

const booleanStringSchema = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z.string().min(1),
    FRONTEND_URL: z.url().transform((value) => new URL(value).origin),
    SESSION_SECRET: z.string().min(32),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    TRUST_PROXY: booleanStringSchema,
  })
  .superRefine((environment, context) => {
    if (environment.COOKIE_SAME_SITE === "none" && environment.NODE_ENV !== "production") {
      context.addIssue({
        code: "custom",
        path: ["COOKIE_SAME_SITE"],
        message: "SameSite=None requires production HTTPS and secure cookies",
      });
    }
  });

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Invalid environment configuration", z.flattenError(parsedEnvironment.error));
  throw new Error("Invalid environment configuration");
}

export const env = parsedEnvironment.data;
