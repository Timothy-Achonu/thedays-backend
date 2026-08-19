import { randomBytes } from "node:crypto";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

export const RESERVED_USERNAMES = new Set([
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

export const USERNAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export interface GoogleUsernameSource {
  email: string;
  givenName?: string;
  familyName?: string;
}

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(value);
}

export function isValidUsername(value: string): boolean {
  return (
    value.length >= USERNAME_MIN_LENGTH &&
    value.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(value) &&
    !isReservedUsername(value)
  );
}

export function sanitizeUsernameSource(value: string): string {
  const ascii = value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  let sanitized = ascii.replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/_+/g, "_").replaceAll(/^_|_$/g, "");

  if (/^[0-9]/.test(sanitized)) {
    sanitized = `u${sanitized}`;
  }

  return sanitized.slice(0, USERNAME_MAX_LENGTH);
}

export function generateRandomUsername(): string {
  return `user_${randomBytes(5).toString("hex")}`;
}

export function usernameBaseFromGoogleIdentity(identity: GoogleUsernameSource): string {
  const fromName = sanitizeUsernameSource([identity.givenName, identity.familyName].filter(Boolean).join(" "));
  const emailLocalPart = identity.email.split("@")[0] ?? "";
  const fromEmail = sanitizeUsernameSource(emailLocalPart);

  if (isValidUsername(fromName)) {
    return fromName;
  }

  if (isValidUsername(fromEmail)) {
    return fromEmail;
  }

  return generateRandomUsername();
}

export function usernameCandidate(base: string, attempt: number): string {
  if (attempt === 0) {
    return base;
  }

  const suffix = `_${attempt + 1}`;
  const truncatedBase = base.slice(0, USERNAME_MAX_LENGTH - suffix.length);

  return `${truncatedBase}${suffix}`;
}
