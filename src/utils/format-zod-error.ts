import { z, type ZodError } from "zod";

type ZodIssue = z.core.$ZodIssue;

const GENERIC_ZOD_MESSAGE_PREFIXES = [
  "Invalid input:",
  "Too small:",
  "Too big:",
  "Unrecognized key:",
] as const;

function isGenericZodMessage(message: string): boolean {
  return GENERIC_ZOD_MESSAGE_PREFIXES.some((prefix) => message.startsWith(prefix));
}

function isMissingValueIssue(issue: ZodIssue): boolean {
  return issue.code === "invalid_type" && /received (undefined|null)/.test(issue.message);
}

export function formatValidationIssueMessage(issue: ZodIssue): string {
  if (issue.code === "invalid_format" && issue.format === "email") {
    return "Must be a valid email address";
  }

  if (issue.message && !isGenericZodMessage(issue.message)) {
    return issue.message;
  }

  if (isMissingValueIssue(issue)) {
    return "This field is required";
  }

  if (issue.code === "unrecognized_keys") {
    const keys = issue.keys.join('", "');
    return issue.keys.length === 1
      ? `Field "${keys}" is not allowed`
      : `Fields "${keys}" are not allowed`;
  }

  if (issue.code === "too_small" && issue.origin === "string") {
    return `Must be at least ${issue.minimum} characters`;
  }

  if (issue.code === "too_big" && issue.origin === "string") {
    return `Must be at most ${issue.maximum} characters`;
  }

  return issue.message;
}

export function formatZodError(error: ZodError) {
  return z.flattenError(error, formatValidationIssueMessage);
}
