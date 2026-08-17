import { describe, expect, it } from "vitest";

import { createSessionExpiry, createSessionToken, hashSessionToken } from "../src/utils/session.js";

describe("sessions", () => {
  it("creates opaque tokens and stable non-reversible hashes", () => {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);

    expect(token).toHaveLength(43);
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).not.toContain(token);
    expect(hashSessionToken(token)).toBe(tokenHash);
  });

  it("uses the configured session lifetime", () => {
    const now = new Date("2026-08-16T12:00:00.000Z");

    expect(createSessionExpiry(now).toISOString()).toBe("2026-09-15T12:00:00.000Z");
  });
});
