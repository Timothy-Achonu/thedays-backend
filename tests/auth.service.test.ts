import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../src/utils/app-error.js";
import { hashOtp, OTP_MAX_ATTEMPTS } from "../src/utils/otp.js";
import { hashPassword } from "../src/utils/password.js";

const { prismaMock, sendVerificationOtp, EmailDeliveryError, verifyGoogleIdToken } = vi.hoisted(() => {
  class EmailDeliveryError extends Error {
    constructor() {
      super("Failed to send verification email");
      this.name = "EmailDeliveryError";
    }
  }

  return {
    EmailDeliveryError,
    sendVerificationOtp: vi.fn(),
    verifyGoogleIdToken: vi.fn(),
    prismaMock: {
      $transaction: vi.fn(),
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      emailVerification: {
        upsert: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      session: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock("../src/db/prisma.js", () => ({
  prisma: prismaMock,
}));

vi.mock("../src/services/email.service.js", () => ({
  sendVerificationOtp,
  EmailDeliveryError,
}));

vi.mock("../src/utils/google-id-token.js", () => ({
  verifyGoogleIdToken,
}));

import {
  loginUser,
  loginWithGoogle,
  registerUser,
  resendVerificationEmail,
  updateCurrentUser,
  verifyUserEmail,
} from "../src/services/auth.service.js";

const now = new Date();

function unverifiedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_1",
    username: "example_user",
    email: "user@example.com",
    passwordHash: "hash",
    timezone: "UTC",
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
    emailVerification: null,
    ...overrides,
  };
}

describe("auth service email verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback: (tx: typeof prismaMock) => unknown) =>
      Promise.resolve(callback(prismaMock)),
    );
    sendVerificationOtp.mockResolvedValue(undefined);
  });

  it("registers an unverified user, emails an OTP, and does not create a session", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "user_1", email: "user@example.com" });
    prismaMock.emailVerification.upsert.mockResolvedValue({});
    prismaMock.emailVerification.update.mockResolvedValue({});

    const result = await registerUser({
      username: "example_user",
      email: "user@example.com",
      password: "password123",
      timezone: "UTC",
    });

    expect(result).toEqual({ email: "user@example.com" });
    expect(prismaMock.session.create).not.toHaveBeenCalled();
    expect(sendVerificationOtp).toHaveBeenCalledOnce();
    expect(sendVerificationOtp.mock.calls[0]?.[0]).toBe("user@example.com");
    expect(sendVerificationOtp.mock.calls[0]?.[1]).toMatch(/^\d{6}$/);
  });

  it("returns 503 without a session when Brevo sending fails after the user is created", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "user_1", email: "user@example.com" });
    prismaMock.emailVerification.upsert.mockResolvedValue({});
    sendVerificationOtp.mockRejectedValue(new EmailDeliveryError());

    const error = await registerUser({
      username: "example_user",
      email: "user@example.com",
      password: "password123",
      timezone: "UTC",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      statusCode: 503,
      code: "EMAIL_DELIVERY_FAILED",
      details: { email: "user@example.com" },
    });
    expect(prismaMock.session.create).not.toHaveBeenCalled();
  });

  it("rejects a verified email and restarts an unverified one", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ ...unverifiedUser(), emailVerifiedAt: now })
      .mockResolvedValueOnce(null);

    const verifiedConflict = await registerUser({
      username: "example_user",
      email: "user@example.com",
      password: "password123",
      timezone: "UTC",
    }).catch((caught: unknown) => caught);

    expect(verifiedConflict).toMatchObject({ statusCode: 409, code: "EMAIL_ALREADY_REGISTERED" });

    prismaMock.user.findUnique
      .mockResolvedValueOnce(unverifiedUser())
      .mockResolvedValueOnce(unverifiedUser());
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.emailVerification.upsert.mockResolvedValue({});
    prismaMock.emailVerification.update.mockResolvedValue({});

    const restarted = await registerUser({
      username: "example_user",
      email: "user@example.com",
      password: "password123",
      timezone: "UTC",
    });

    expect(restarted).toEqual({ email: "user@example.com" });
    expect(prismaMock.user.update).toHaveBeenCalledOnce();
    expect(sendVerificationOtp).toHaveBeenCalledOnce();
  });

  it("skips sending when an unverified user re-registers inside the cooldown window", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      unverifiedUser({
        emailVerification: {
          lastSentAt: new Date(),
          codeHash: "x",
          expiresAt: new Date(),
          attemptCount: 0,
          id: "ev_1",
        },
      }),
    );
    prismaMock.user.update.mockResolvedValue({});

    await registerUser({
      username: "example_user",
      email: "user@example.com",
      password: "password123",
      timezone: "UTC",
    });

    expect(prismaMock.emailVerification.upsert).not.toHaveBeenCalled();
    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("deletes a stale unverified username occupant so a new registration can proceed", async () => {
    const staleOccupant = unverifiedUser({
      id: "user_old",
      username: "example_user",
      email: "old@example.com",
      createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1_000),
    });
    prismaMock.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(staleOccupant);
    prismaMock.user.delete.mockResolvedValue({});
    prismaMock.user.create.mockResolvedValue({ id: "user_1", email: "user@example.com" });
    prismaMock.emailVerification.upsert.mockResolvedValue({});
    prismaMock.emailVerification.update.mockResolvedValue({});

    await registerUser({
      username: "example_user",
      email: "user@example.com",
      password: "password123",
      timezone: "UTC",
    });

    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "user_old" } });
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
  });

  it("rejects login of an unverified user after the password check", async () => {
    const passwordHash = await hashPassword("password123");
    prismaMock.user.findUnique.mockResolvedValue(unverifiedUser({ passwordHash }));

    const error = await loginUser({
      email: "user@example.com",
      password: "password123",
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ statusCode: 403, code: "EMAIL_NOT_VERIFIED" });
    expect(prismaMock.session.create).not.toHaveBeenCalled();
  });

  it("signs in without changing the user's saved timezone", async () => {
    const passwordHash = await hashPassword("password123");
    prismaMock.user.findUnique.mockResolvedValue(
      unverifiedUser({
        passwordHash,
        emailVerifiedAt: now,
        timezone: "America/Toronto",
      }),
    );
    prismaMock.session.create.mockResolvedValue({});

    const result = await loginUser({
      email: "user@example.com",
      password: "password123",
    });

    expect(result.user.timezone).toBe("America/Toronto");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("issues a session when a valid OTP is submitted and refuses reuse", async () => {
    const otp = "123456";
    const user = unverifiedUser({
      emailVerification: {
        id: "ev_1",
        userId: "user_1",
        codeHash: hashOtp(otp),
        expiresAt: new Date(now.getTime() + 60_000),
        attemptCount: 0,
        lastSentAt: now,
      },
    });
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.emailVerification.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.user.update.mockResolvedValue({
      id: user.id,
      username: user.username,
      email: user.email,
      timezone: user.timezone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    prismaMock.session.create.mockResolvedValue({});

    const result = await verifyUserEmail({ email: "user@example.com", code: otp });

    expect(result.user.email).toBe("user@example.com");
    expect(result.sessionToken).toEqual(expect.any(String));
    expect(prismaMock.emailVerification.deleteMany).toHaveBeenCalledWith({ where: { id: "ev_1" } });

    prismaMock.user.findUnique.mockResolvedValue({ ...user, emailVerification: null, emailVerifiedAt: now });

    const reuseError = await verifyUserEmail({ email: "user@example.com", code: otp }).catch(
      (caught: unknown) => caught,
    );

    expect(reuseError).toMatchObject({ statusCode: 400, code: "INVALID_OR_EXPIRED_CODE" });
  });

  it("locks the code after too many failed attempts", async () => {
    const user = unverifiedUser({
      emailVerification: {
        id: "ev_1",
        userId: "user_1",
        codeHash: hashOtp("123456"),
        expiresAt: new Date(now.getTime() + 60_000),
        attemptCount: OTP_MAX_ATTEMPTS - 1,
        lastSentAt: now,
      },
    });
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.emailVerification.deleteMany.mockResolvedValue({ count: 1 });

    const error = await verifyUserEmail({ email: "user@example.com", code: "000000" }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ statusCode: 400, code: "INVALID_OR_EXPIRED_CODE" });
    expect(prismaMock.emailVerification.deleteMany).toHaveBeenCalledWith({ where: { id: "ev_1" } });
  });

  it("does not reveal whether an email exists for nonexistent, verified, or cooldown resends", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(resendVerificationEmail({ email: "missing@example.com" })).resolves.toBeUndefined();
    expect(sendVerificationOtp).not.toHaveBeenCalled();

    prismaMock.user.findUnique.mockResolvedValue(unverifiedUser({ emailVerifiedAt: now }));
    await expect(resendVerificationEmail({ email: "verified@example.com" })).resolves.toBeUndefined();
    expect(sendVerificationOtp).not.toHaveBeenCalled();

    prismaMock.user.findUnique.mockResolvedValue(
      unverifiedUser({
        emailVerification: { lastSentAt: now, id: "ev_1", codeHash: "x", expiresAt: now, attemptCount: 0 },
      }),
    );
    await expect(resendVerificationEmail({ email: "user@example.com" })).resolves.toBeUndefined();
    expect(sendVerificationOtp).not.toHaveBeenCalled();
  });

  it("returns 503 and leaves lastSentAt unset when an eligible resend fails", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      unverifiedUser({
        emailVerification: {
          lastSentAt: new Date(now.getTime() - 61_000),
          id: "ev_1",
          codeHash: "x",
          expiresAt: now,
          attemptCount: 0,
        },
      }),
    );
    prismaMock.emailVerification.upsert.mockResolvedValue({});
    sendVerificationOtp.mockRejectedValue(new EmailDeliveryError());

    const error = await resendVerificationEmail({ email: "user@example.com" }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ statusCode: 503, code: "EMAIL_DELIVERY_FAILED" });
    expect(prismaMock.emailVerification.upsert.mock.calls[0]?.[0]).toMatchObject({
      update: { lastSentAt: null },
    });
    expect(prismaMock.emailVerification.update).not.toHaveBeenCalled();
  });

  it("sets lastSentAt only after Brevo accepts an eligible resend", async () => {
    const acceptedAt = new Date("2026-08-21T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(acceptedAt);
    prismaMock.user.findUnique.mockResolvedValue(unverifiedUser());
    prismaMock.emailVerification.upsert.mockResolvedValue({});
    prismaMock.emailVerification.update.mockResolvedValue({});

    await resendVerificationEmail({ email: "user@example.com" });

    expect(sendVerificationOtp).toHaveBeenCalledOnce();
    expect(prismaMock.emailVerification.update).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: { lastSentAt: acceptedAt },
    });
    vi.useRealTimers();
  });
});

const googleIdentity = {
  googleSub: "google-sub-1",
  email: "user@example.com",
  givenName: "Jane",
  familyName: "Doe",
};

function publicUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_1",
    username: "jane_doe",
    email: "user@example.com",
    timezone: "Africa/Lagos",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function mockUserFindUnique(users: {
  googleSub?: Record<string, unknown> | null;
  email?: Record<string, unknown> | null;
  username?: Record<string, unknown> | null;
}) {
  prismaMock.user.findUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
    if ("googleSub" in where) {
      return Promise.resolve(users.googleSub ?? null);
    }

    if ("email" in where) {
      return Promise.resolve(users.email ?? null);
    }

    if ("username" in where) {
      return Promise.resolve(users.username ?? null);
    }

    return Promise.resolve(null);
  });
}

describe("auth service Google sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback: (tx: typeof prismaMock) => unknown) =>
      Promise.resolve(callback(prismaMock)),
    );
    verifyGoogleIdToken.mockResolvedValue(googleIdentity);
    prismaMock.session.create.mockResolvedValue({});
  });

  it("creates a Google-only user and issues a session", async () => {
    mockUserFindUnique({});
    prismaMock.user.create.mockResolvedValue(publicUser());

    const result = await loginWithGoogle({
      idToken: "google-id-token",
      timezone: "Africa/Lagos",
    });

    expect(result.user.email).toBe("user@example.com");
    expect(result.sessionToken).toEqual(expect.any(String));
    expect(prismaMock.user.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        username: "jane_doe",
        email: "user@example.com",
        passwordHash: null,
        googleSub: "google-sub-1",
        timezone: "Africa/Lagos",
      },
    });
    expect(prismaMock.session.create).toHaveBeenCalledOnce();
  });

  it("signs in an existing Google user", async () => {
    mockUserFindUnique({ googleSub: publicUser() });

    const result = await loginWithGoogle({
      idToken: "google-id-token",
      timezone: "UTC",
    });

    expect(result.user.id).toBe("user_1");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.session.create).toHaveBeenCalledOnce();
  });

  it("links Google to an unverified email account and marks it verified", async () => {
    mockUserFindUnique({
      email: {
        ...unverifiedUser(),
        emailVerification: { id: "ev_1" },
      },
    });
    prismaMock.user.update.mockResolvedValue(publicUser());
    prismaMock.emailVerification.deleteMany.mockResolvedValue({ count: 1 });

    const result = await loginWithGoogle({
      idToken: "google-id-token",
      timezone: "UTC",
    });

    expect(result.user.email).toBe("user@example.com");
    expect(prismaMock.user.update.mock.calls[0]?.[0]).toMatchObject({
      data: {
        googleSub: "google-sub-1",
      },
    });
    expect(prismaMock.emailVerification.deleteMany).toHaveBeenCalledWith({ where: { userId: "user_1" } });
    expect(prismaMock.session.create).toHaveBeenCalledOnce();
  });

  it("links Google to a verified email-and-password account", async () => {
    mockUserFindUnique({
      email: {
        ...publicUser(),
        emailVerifiedAt: now,
        emailVerification: null,
      },
    });
    prismaMock.user.update.mockResolvedValue(publicUser());

    await loginWithGoogle({
      idToken: "google-id-token",
      timezone: "UTC",
    });

    expect(prismaMock.user.update).toHaveBeenCalledOnce();
    expect(prismaMock.emailVerification.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("propagates an invalid Google token without creating a session", async () => {
    verifyGoogleIdToken.mockRejectedValue(new AppError(401, "INVALID_GOOGLE_TOKEN", "Google sign-in failed"));

    const error = await loginWithGoogle({
      idToken: "bad-token",
      timezone: "UTC",
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ statusCode: 401, code: "INVALID_GOOGLE_TOKEN" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.session.create).not.toHaveBeenCalled();
  });

  it("tells password login to use Google when the account has no password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...publicUser(),
      passwordHash: null,
      emailVerifiedAt: now,
    });

    const error = await loginUser({
      email: "user@example.com",
      password: "password123",
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ statusCode: 401, code: "USE_GOOGLE_SIGN_IN" });
    expect(prismaMock.session.create).not.toHaveBeenCalled();
  });
});

describe("auth service current-user settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates only the authenticated user's timezone and returns the public user", async () => {
    const updatedUser = publicUser({ timezone: "America/Toronto" });
    prismaMock.user.update.mockResolvedValue(updatedUser);

    const result = await updateCurrentUser("user_1", { timezone: "America/Toronto" });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { timezone: "America/Toronto" },
      select: {
        id: true,
        username: true,
        email: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual(updatedUser);
    expect(result).not.toHaveProperty("passwordHash");
  });
});
