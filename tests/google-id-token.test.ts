import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyIdToken } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: class MockOAuth2Client {
    verifyIdToken = verifyIdToken;
  },
}));

import { AppError } from "../src/utils/app-error.js";
import { verifyGoogleIdToken } from "../src/utils/google-id-token.js";

function ticket(payload: Record<string, unknown> | undefined) {
  return {
    getPayload: () => payload,
  };
}

describe("verifyGoogleIdToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("returns identity claims from a verified Google ID token", async () => {
    verifyIdToken.mockResolvedValue(
      ticket({
        sub: "google-sub-1",
        email: "User@Example.com",
        email_verified: true,
        given_name: "Jane",
        family_name: "Doe",
      }),
    );

    await expect(verifyGoogleIdToken("google-id-token")).resolves.toEqual({
      googleSub: "google-sub-1",
      email: "user@example.com",
      givenName: "Jane",
      familyName: "Doe",
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("rejects tokens whose email is not verified", async () => {
    verifyIdToken.mockResolvedValue(
      ticket({
        sub: "google-sub-1",
        email: "user@example.com",
        email_verified: false,
      }),
    );

    const error = await verifyGoogleIdToken("google-id-token").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode: 401, code: "INVALID_GOOGLE_TOKEN" });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("rejects tokens that Google verification fails", async () => {
    verifyIdToken.mockRejectedValue(new Error("invalid token"));

    const error = await verifyGoogleIdToken("google-id-token").catch((caught: unknown) => caught);

    expect(error).toMatchObject({ statusCode: 401, code: "INVALID_GOOGLE_TOKEN" });
    expect(console.error).not.toHaveBeenCalled();
  });
});
