import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../src/utils/password.js";

describe("password hashing", () => {
  it("hashes with Argon2id and verifies the original password", async () => {
    const passwordHash = await hashPassword("correct horse battery staple");

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(passwordHash, "correct horse battery staple")).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, "wrong password")).resolves.toBe(false);
  });
});
