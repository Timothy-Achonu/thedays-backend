import { describe, expect, it } from "vitest";

import {
  generateRandomUsername,
  isValidUsername,
  sanitizeUsernameSource,
  usernameBaseFromGoogleIdentity,
  usernameCandidate,
} from "../src/utils/username.js";

describe("username helpers", () => {
  it("sanitizes names into username characters and strips accents", () => {
    expect(sanitizeUsernameSource("Jane Doe")).toBe("jane_doe");
    expect(sanitizeUsernameSource("José María")).toBe("jose_maria");
    expect(sanitizeUsernameSource("123abc")).toBe("u123abc");
    expect(sanitizeUsernameSource("***")).toBe("");
  });

  it("builds a username from Google given and family names", () => {
    expect(
      usernameBaseFromGoogleIdentity({
        email: "jane@example.com",
        givenName: "Jane",
        familyName: "Doe",
      }),
    ).toBe("jane_doe");
  });

  it("falls back to the email local-part when the name is not a valid username", () => {
    expect(
      usernameBaseFromGoogleIdentity({
        email: "tracker_fan@example.com",
        givenName: "李",
        familyName: "明",
      }),
    ).toBe("tracker_fan");
  });

  it("falls back to a generated username when name and email are unusable", () => {
    const username = usernameBaseFromGoogleIdentity({
      email: "1@example.com",
      givenName: "李",
    });

    expect(isValidUsername(username)).toBe(true);
    expect(username.startsWith("user_")).toBe(true);
  });

  it("appends a numeric suffix and stays within 30 characters", () => {
    expect(usernameCandidate("jane_doe", 0)).toBe("jane_doe");
    expect(usernameCandidate("jane_doe", 1)).toBe("jane_doe_2");
    expect(usernameCandidate("a".repeat(30), 1).length).toBe(30);
  });

  it("generates valid random usernames", () => {
    expect(isValidUsername(generateRandomUsername())).toBe(true);
  });

  it("rejects reserved usernames", () => {
    expect(isValidUsername("admin")).toBe(false);
  });
});
