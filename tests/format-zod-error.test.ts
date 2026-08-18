import { describe, expect, it } from "vitest";
import { z } from "zod";

import { formatValidationIssueMessage, formatZodError } from "../src/utils/format-zod-error.js";

describe("formatZodError", () => {
  it("maps missing required fields to a clear message", () => {
    const schema = z.object({
      name: z.string(),
    });
    const error = schema.safeParse({}).error!;

    expect(formatZodError(error)).toEqual({
      formErrors: [],
      fieldErrors: {
        name: ["This field is required"],
      },
    });
  });

  it("maps unrecognized keys to a clear form error", () => {
    const schema = z.object({ name: z.string() }).strict();
    const error = schema.safeParse({ name: "Example", isAdmin: true }).error!;

    expect(formatZodError(error)).toEqual({
      formErrors: ['Field "isAdmin" is not allowed'],
      fieldErrors: {},
    });
  });

  it("preserves custom schema messages", () => {
    const schema = z.object({
      name: z.string({ error: "Name is required" }),
    });
    const error = schema.safeParse({}).error!;

    expect(formatZodError(error)).toEqual({
      formErrors: [],
      fieldErrors: {
        name: ["Name is required"],
      },
    });
  });

  it("maps generic string length errors when no custom message exists", () => {
    const schema = z.object({
      password: z.string().min(8),
    });
    const error = schema.safeParse({ password: "short" }).error!;

    expect(formatZodError(error)).toEqual({
      formErrors: [],
      fieldErrors: {
        password: ["Must be at least 8 characters"],
      },
    });
  });
});

describe("formatValidationIssueMessage", () => {
  it("maps invalid email format to a clear message", () => {
    const schema = z.email();
    const issue = schema.safeParse("not-an-email").error!.issues[0]!;

    expect(formatValidationIssueMessage(issue)).toBe("Must be a valid email address");
  });
});
