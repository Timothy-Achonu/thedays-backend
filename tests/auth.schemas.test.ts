import { describe, expect, it } from "vitest";

import { loginBodySchema, registerBodySchema } from "../src/validators/auth.schemas.js";

describe("authentication request validation", () => {
  it("normalizes registration fields and defaults the timezone", () => {
    const result = registerBodySchema.parse({
      name: "  Example User  ",
      email: "  USER@Example.COM ",
      password: "password123",
    });

    expect(result).toEqual({
      name: "Example User",
      email: "user@example.com",
      password: "password123",
      timezone: "UTC",
    });
  });

  it("accepts an IANA timezone", () => {
    const result = registerBodySchema.parse({
      name: "Example User",
      email: "user@example.com",
      password: "password123",
      timezone: "Africa/Lagos",
    });

    expect(result.timezone).toBe("Africa/Lagos");
  });

  it("rejects unknown fields and invalid timezones", () => {
    const result = registerBodySchema.safeParse({
      name: "Example User",
      email: "user@example.com",
      password: "password123",
      timezone: "Lagos",
      isAdmin: true,
    });

    expect(result.success).toBe(false);
  });

  it("requires a bounded password", () => {
    expect(loginBodySchema.safeParse({ email: "user@example.com", password: "short" }).success).toBe(
      false,
    );
    expect(
      loginBodySchema.safeParse({ email: "user@example.com", password: "a".repeat(129) }).success,
    ).toBe(false);
  });
});
