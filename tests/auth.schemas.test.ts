import { describe, expect, it } from "vitest";

import {
  loginBodySchema,
  registerBodySchema,
  resendVerificationBodySchema,
  verifyEmailBodySchema,
} from "../src/validators/auth.schemas.js";

describe("authentication request validation", () => {
  it("normalizes registration fields and defaults the timezone", () => {
    const result = registerBodySchema.parse({
      username: "  Example_User  ",
      email: "  USER@Example.COM ",
      password: "password123",
    });

    expect(result).toEqual({
      username: "example_user",
      email: "user@example.com",
      password: "password123",
      timezone: "UTC",
    });
  });

  it("accepts an IANA timezone", () => {
    const result = registerBodySchema.parse({
      username: "example_user",
      email: "user@example.com",
      password: "password123",
      timezone: "Africa/Lagos",
    });

    expect(result.timezone).toBe("Africa/Lagos");
  });

  it("rejects unknown fields and invalid timezones", () => {
    const result = registerBodySchema.safeParse({
      username: "example_user",
      email: "user@example.com",
      password: "password123",
      timezone: "Lagos",
      isAdmin: true,
    });

    expect(result.success).toBe(false);
  });

  it("returns clear messages for a missing username", () => {
    const result = registerBodySchema.safeParse({
      email: "user@example.com",
      password: "password123",
      timezone: "Africa/Lagos",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues.some((issue) => issue.path[0] === "username")).toBe(true);
    expect(result.error.issues.find((issue) => issue.path[0] === "username")?.message).toBe(
      "Username is required",
    );
  });

  it("rejects usernames with invalid characters", () => {
    const result = registerBodySchema.safeParse({
      username: "Example User",
      email: "user@example.com",
      password: "password123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects usernames that start with an underscore", () => {
    const result = registerBodySchema.safeParse({
      username: "_tim",
      email: "user@example.com",
      password: "password123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects usernames that are too short", () => {
    const result = registerBodySchema.safeParse({
      username: "ab",
      email: "user@example.com",
      password: "password123",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues.some((issue) => issue.message === "Username must be at least 3 characters")).toBe(
      true,
    );
  });

  it("rejects reserved usernames", () => {
    const result = registerBodySchema.safeParse({
      username: "admin",
      email: "user@example.com",
      password: "password123",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues.some((issue) => issue.message === "This username is reserved")).toBe(true);
  });

  it("returns clear messages for password length violations", () => {
    const shortPassword = loginBodySchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    const longPassword = loginBodySchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(129),
    });

    expect(shortPassword.success).toBe(false);
    expect(longPassword.success).toBe(false);

    if (shortPassword.success || longPassword.success) {
      return;
    }

    expect(shortPassword.error.issues[0]?.message).toBe("Password must be at least 8 characters");
    expect(longPassword.error.issues[0]?.message).toBe("Password must be at most 128 characters");
  });

  it("accepts a 6-digit verification code and normalizes the email", () => {
    const result = verifyEmailBodySchema.parse({
      email: "  USER@Example.COM ",
      code: "123456",
    });

    expect(result).toEqual({
      email: "user@example.com",
      code: "123456",
    });
  });

  it("rejects verification codes that are not 6 digits", () => {
    const result = verifyEmailBodySchema.safeParse({
      email: "user@example.com",
      code: "12345",
    });

    expect(result.success).toBe(false);
  });

  it("requires an email to resend verification", () => {
    const result = resendVerificationBodySchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
