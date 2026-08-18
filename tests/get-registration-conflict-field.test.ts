import { describe, expect, it } from "vitest";

import { getRegistrationConflictField } from "../src/utils/get-registration-conflict-field.js";

function makeError(meta: Record<string, unknown>): unknown {
  return { code: "P2002", meta };
}

describe("getRegistrationConflictField", () => {
  it("returns username when meta.target contains the username field", () => {
    expect(getRegistrationConflictField(makeError({ target: ["username"] }))).toBe("username");
  });

  it("returns username when meta.target contains the username index name", () => {
    expect(getRegistrationConflictField(makeError({ target: ["users_username_key"] }))).toBe("username");
  });

  it("returns email when meta.target contains the email field", () => {
    expect(getRegistrationConflictField(makeError({ target: ["email"] }))).toBe("email");
  });

  it("returns email when meta.target contains the email index name", () => {
    expect(getRegistrationConflictField(makeError({ target: ["users_email_key"] }))).toBe("email");
  });

  it("returns username from driver adapter constraint fields", () => {
    expect(
      getRegistrationConflictField(
        makeError({
          driverAdapterError: {
            cause: {
              constraint: {
                fields: ['"username"'],
              },
            },
          },
        }),
      ),
    ).toBe("username");
  });

  it("returns email from driver adapter constraint index", () => {
    expect(
      getRegistrationConflictField(
        makeError({
          driverAdapterError: {
            cause: {
              constraint: {
                index: "users_email_key",
              },
            },
          },
        }),
      ),
    ).toBe("email");
  });

  it("returns null when metadata is missing or unknown", () => {
    expect(getRegistrationConflictField(makeError({}))).toBeNull();
    expect(getRegistrationConflictField(makeError({ target: ["sessions_tokenHash_key"] }))).toBeNull();
    expect(getRegistrationConflictField({ code: "P2002" })).toBeNull();
  });
});
