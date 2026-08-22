import { prisma } from "../db/prisma.js";
import type { AuthenticatedUser } from "../types/auth.js";
import { AppError } from "../utils/app-error.js";
import { getRegistrationConflictField } from "../utils/get-registration-conflict-field.js";
import type { GoogleIdentity } from "../utils/google-id-token.js";
import { verifyGoogleIdToken } from "../utils/google-id-token.js";
import {
  generateOtp,
  hashOtp,
  isStaleUnverifiedAccount,
  isWithinResendCooldown,
  OTP_MAX_ATTEMPTS,
  otpExpiresAt,
  otpMatches,
} from "../utils/otp.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createSessionExpiry, createSessionToken, hashSessionToken } from "../utils/session.js";
import {
  generateRandomUsername,
  isValidUsername,
  usernameBaseFromGoogleIdentity,
  usernameCandidate,
} from "../utils/username.js";
import type {
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  UpdateCurrentUserInput,
  VerifyEmailInput,
} from "../validators/auth.schemas.js";
import { EmailDeliveryError, sendVerificationOtp } from "./email.service.js";

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
} as const;

interface AuthenticationResult {
  user: AuthenticatedUser;
  sessionToken: string;
  expiresAt: Date;
}

interface RegistrationResult {
  email: string;
}

let dummyPasswordHashPromise: Promise<string> | undefined;

function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHashPromise ??= hashPassword("not-a-real-user-password");
  return dummyPasswordHashPromise;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function throwRegistrationConflictError(error: unknown): never {
  const conflictField = getRegistrationConflictField(error);

  if (conflictField === "username") {
    throw new AppError(409, "USERNAME_TAKEN", "This username is already taken");
  }

  if (conflictField === "email") {
    throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists");
  }

  throw new AppError(409, "REGISTRATION_CONFLICT", "An account with these details already exists");
}

const USERNAME_ALLOCATION_ATTEMPTS = 25;
const GOOGLE_LOGIN_UNIQUE_RETRIES = 3;

function newSessionCredentials(): { sessionToken: string; tokenHash: string; expiresAt: Date } {
  const sessionToken = createSessionToken();

  return {
    sessionToken,
    tokenHash: hashSessionToken(sessionToken),
    expiresAt: createSessionExpiry(),
  };
}

async function persistSession(
  sessionDelegate: typeof prisma.session,
  userId: string,
  session: { tokenHash: string; expiresAt: Date },
): Promise<void> {
  await sessionDelegate.create({
    data: {
      userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
    },
  });
}

async function allocateUniqueUsername(
  transaction: { user: typeof prisma.user },
  identity: GoogleIdentity,
): Promise<string> {
  const base = usernameBaseFromGoogleIdentity(identity);

  for (let attempt = 0; attempt < USERNAME_ALLOCATION_ATTEMPTS; attempt += 1) {
    const candidate = usernameCandidate(base, attempt);

    if (!isValidUsername(candidate)) {
      continue;
    }

    const occupant = await transaction.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!occupant) {
      return candidate;
    }
  }

  return generateRandomUsername();
}

function toAuthenticatedUser(user: AuthenticatedUser): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    timezone: user.timezone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function invalidOrExpiredCodeError(): AppError {
  return new AppError(400, "INVALID_OR_EXPIRED_CODE", "Invalid or expired verification code");
}

function emailDeliveryFailedError(email: string): AppError {
  return new AppError(
    503,
    "EMAIL_DELIVERY_FAILED",
    "We could not send the verification email. Please try again in a moment.",
    { email },
  );
}

async function sendOtpOrThrow(email: string, otp: string, userId: string): Promise<void> {
  try {
    await sendVerificationOtp(email, otp);
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      throw emailDeliveryFailedError(email);
    }

    throw error;
  }

  await prisma.emailVerification.update({
    where: { userId },
    data: { lastSentAt: new Date() },
  });
}

type RegistrationTransaction = {
  user: typeof prisma.user;
  emailVerification: typeof prisma.emailVerification;
};

async function upsertEmailVerification(
  transaction: RegistrationTransaction,
  userId: string,
  otp: string,
  now: Date,
): Promise<void> {
  const codeHash = hashOtp(otp);

  await transaction.emailVerification.upsert({
    where: { userId },
    create: {
      userId,
      codeHash,
      expiresAt: otpExpiresAt(now),
      attemptCount: 0,
    },
    update: {
      codeHash,
      expiresAt: otpExpiresAt(now),
      attemptCount: 0,
      lastSentAt: null,
    },
  });
}

async function releaseOrRejectUsername(
  transaction: RegistrationTransaction,
  occupant: { id: string; emailVerifiedAt: Date | null; createdAt: Date },
  now: Date,
): Promise<void> {
  if (occupant.emailVerifiedAt || !isStaleUnverifiedAccount(occupant.createdAt, now)) {
    throw new AppError(409, "USERNAME_TAKEN", "This username is already taken");
  }

  await transaction.user.delete({ where: { id: occupant.id } });
}

export async function registerUser(input: RegisterInput): Promise<RegistrationResult> {
  const passwordHash = await hashPassword(input.password);
  const otp = generateOtp();
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const existingByEmail = await transaction.user.findUnique({
        where: { email: input.email },
        include: { emailVerification: true },
      });
      const existingByUsername = await transaction.user.findUnique({
        where: { username: input.username },
      });

      if (existingByEmail?.emailVerifiedAt) {
        throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists");
      }

      if (existingByUsername && existingByUsername.id !== existingByEmail?.id) {
        await releaseOrRejectUsername(transaction, existingByUsername, now);
      }

      if (existingByEmail) {
        const withinCooldown = isWithinResendCooldown(existingByEmail.emailVerification?.lastSentAt, now);

        await transaction.user.update({
          where: { id: existingByEmail.id },
          data: {
            passwordHash,
            username: input.username,
            timezone: input.timezone,
          },
        });

        if (withinCooldown) {
          return { userId: existingByEmail.id, email: existingByEmail.email, otp: null };
        }

        await upsertEmailVerification(transaction, existingByEmail.id, otp, now);
        return { userId: existingByEmail.id, email: existingByEmail.email, otp };
      }

      const createdUser = await transaction.user.create({
        data: {
          username: input.username,
          email: input.email,
          passwordHash,
          timezone: input.timezone,
        },
        select: { id: true, email: true },
      });

      await upsertEmailVerification(transaction, createdUser.id, otp, now);
      return { userId: createdUser.id, email: createdUser.email, otp };
    });

    if (result.otp) {
      await sendOtpOrThrow(result.email, result.otp, result.userId);
    }

    return { email: result.email };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (isUniqueConstraintError(error)) {
      throwRegistrationConflictError(error);
    }

    throw error;
  }
}

export async function verifyUserEmail(input: VerifyEmailInput): Promise<AuthenticationResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { emailVerification: true },
  });

  const verification = user?.emailVerification;
  const dummyHash = hashOtp("000000");
  const codeIsValid = verification ? otpMatches(verification.codeHash, input.code) : otpMatches(dummyHash, input.code);

  if (!user || user.emailVerifiedAt || !verification) {
    throw invalidOrExpiredCodeError();
  }

  if (verification.expiresAt <= new Date() || verification.attemptCount >= OTP_MAX_ATTEMPTS) {
    await prisma.emailVerification.deleteMany({ where: { id: verification.id } });
    throw invalidOrExpiredCodeError();
  }

  if (!codeIsValid) {
    const nextAttemptCount = verification.attemptCount + 1;

    if (nextAttemptCount >= OTP_MAX_ATTEMPTS) {
      await prisma.emailVerification.deleteMany({ where: { id: verification.id } });
    } else {
      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attemptCount: nextAttemptCount },
      });
    }

    throw invalidOrExpiredCodeError();
  }

  const session = newSessionCredentials();
  const verifiedUser = await prisma.$transaction(async (transaction) => {
    await transaction.emailVerification.deleteMany({ where: { id: verification.id } });

    const updatedUser = await transaction.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
      select: publicUserSelect,
    });

    await persistSession(transaction.session, updatedUser.id, session);

    return updatedUser;
  });

  return {
    user: toAuthenticatedUser(verifiedUser),
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
  };
}

export async function resendVerificationEmail(input: ResendVerificationInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { emailVerification: true },
  });

  if (!user || user.emailVerifiedAt) {
    return;
  }

  const now = new Date();

  if (isWithinResendCooldown(user.emailVerification?.lastSentAt, now)) {
    return;
  }

  const otp = generateOtp();

  await prisma.emailVerification.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      codeHash: hashOtp(otp),
      expiresAt: otpExpiresAt(now),
      attemptCount: 0,
    },
    update: {
      codeHash: hashOtp(otp),
      expiresAt: otpExpiresAt(now),
      attemptCount: 0,
      lastSentAt: null,
    },
  });

  await sendOtpOrThrow(input.email, otp, user.id);
}

export async function loginUser(input: LoginInput): Promise<AuthenticationResult> {
  const userWithPassword = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (userWithPassword && userWithPassword.passwordHash === null) {
    throw new AppError(
      401,
      "USE_GOOGLE_SIGN_IN",
      "This account uses Google sign-in. Continue with Google instead.",
    );
  }

  const passwordHash = userWithPassword?.passwordHash ?? (await getDummyPasswordHash());
  const passwordMatches = await verifyPassword(passwordHash, input.password);

  if (!userWithPassword || !passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  if (!userWithPassword.emailVerifiedAt) {
    throw new AppError(403, "EMAIL_NOT_VERIFIED", "Verify your email before signing in");
  }

  const session = newSessionCredentials();
  await persistSession(prisma.session, userWithPassword.id, session);

  return {
    user: toAuthenticatedUser({
      id: userWithPassword.id,
      username: userWithPassword.username,
      email: userWithPassword.email,
      timezone: userWithPassword.timezone,
      createdAt: userWithPassword.createdAt,
      updatedAt: userWithPassword.updatedAt,
    }),
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
  };
}

export async function updateCurrentUser(
  userId: string,
  input: UpdateCurrentUserInput,
): Promise<AuthenticatedUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { timezone: input.timezone },
    select: publicUserSelect,
  });

  return toAuthenticatedUser(user);
}

async function persistGoogleAuthenticatedUser(
  identity: GoogleIdentity,
  timezone: string,
  session: { tokenHash: string; expiresAt: Date },
): Promise<AuthenticatedUser> {
  return prisma.$transaction(async (transaction) => {
    const existingByGoogleSub = await transaction.user.findUnique({
      where: { googleSub: identity.googleSub },
      select: publicUserSelect,
    });

    if (existingByGoogleSub) {
      await persistSession(transaction.session, existingByGoogleSub.id, session);
      return existingByGoogleSub;
    }

    const existingByEmail = await transaction.user.findUnique({
      where: { email: identity.email },
      select: {
        ...publicUserSelect,
        emailVerifiedAt: true,
        emailVerification: { select: { id: true } },
      },
    });

    if (existingByEmail) {
      const updatedUser = await transaction.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleSub: identity.googleSub,
          emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
        },
        select: publicUserSelect,
      });

      if (existingByEmail.emailVerification) {
        await transaction.emailVerification.deleteMany({ where: { userId: existingByEmail.id } });
      }

      await persistSession(transaction.session, updatedUser.id, session);
      return updatedUser;
    }

    const username = await allocateUniqueUsername(transaction, identity);
    const createdUser = await transaction.user.create({
      data: {
        username,
        email: identity.email,
        passwordHash: null,
        googleSub: identity.googleSub,
        timezone,
        emailVerifiedAt: new Date(),
      },
      select: publicUserSelect,
    });

    await persistSession(transaction.session, createdUser.id, session);
    return createdUser;
  });
}

export async function loginWithGoogle(input: GoogleAuthInput): Promise<AuthenticationResult> {
  const identity = await verifyGoogleIdToken(input.idToken);
  const session = newSessionCredentials();

  for (let attempt = 0; attempt < GOOGLE_LOGIN_UNIQUE_RETRIES; attempt += 1) {
    try {
      const user = await persistGoogleAuthenticatedUser(identity, input.timezone, session);

      return {
        user: toAuthenticatedUser(user),
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (!isUniqueConstraintError(error) || attempt === GOOGLE_LOGIN_UNIQUE_RETRIES - 1) {
        throw error;
      }
    }
  }

  throw new AppError(500, "INTERNAL_SERVER_ERROR", "Google sign-in failed. Please try again.");
}

export async function findAuthenticatedSession(sessionToken: string): Promise<{
  user: AuthenticatedUser;
  isEmailVerified: boolean;
} | null> {
  const tokenHash = hashSessionToken(sessionToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          ...publicUserSelect,
          emailVerifiedAt: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return {
    user: toAuthenticatedUser(session.user),
    isEmailVerified: session.user.emailVerifiedAt !== null,
  };
}

export async function revokeSession(sessionToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(sessionToken) },
  });
}
