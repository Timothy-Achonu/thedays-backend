import { prisma } from "../db/prisma.js";
import type { AuthenticatedUser } from "../types/auth.js";
import { AppError } from "../utils/app-error.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createSessionExpiry, createSessionToken, hashSessionToken } from "../utils/session.js";
import type { LoginInput, RegisterInput } from "../validators/auth.schemas.js";

const publicUserSelect = {
  id: true,
  name: true,
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

let dummyPasswordHashPromise: Promise<string> | undefined;

function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHashPromise ??= hashPassword("not-a-real-user-password");
  return dummyPasswordHashPromise;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function newSessionCredentials(): { sessionToken: string; tokenHash: string; expiresAt: Date } {
  const sessionToken = createSessionToken();

  return {
    sessionToken,
    tokenHash: hashSessionToken(sessionToken),
    expiresAt: createSessionExpiry(),
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthenticationResult> {
  const passwordHash = await hashPassword(input.password);
  const session = newSessionCredentials();

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          timezone: input.timezone,
        },
        select: publicUserSelect,
      });

      await transaction.session.create({
        data: {
          userId: createdUser.id,
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
        },
      });

      return createdUser;
    });

    return { user, sessionToken: session.sessionToken, expiresAt: session.expiresAt };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists");
    }

    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<AuthenticationResult> {
  const userWithPassword = await prisma.user.findUnique({
    where: { email: input.email },
  });
  const passwordHash = userWithPassword?.passwordHash ?? (await getDummyPasswordHash());
  const passwordMatches = await verifyPassword(passwordHash, input.password);

  if (!userWithPassword || !passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  const session = newSessionCredentials();
  await prisma.session.create({
    data: {
      userId: userWithPassword.id,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
    },
  });

  const user: AuthenticatedUser = {
    id: userWithPassword.id,
    name: userWithPassword.name,
    email: userWithPassword.email,
    timezone: userWithPassword.timezone,
    createdAt: userWithPassword.createdAt,
    updatedAt: userWithPassword.updatedAt,
  };

  return { user, sessionToken: session.sessionToken, expiresAt: session.expiresAt };
}

export async function findAuthenticatedSession(sessionToken: string): Promise<AuthenticatedUser | null> {
  const tokenHash = hashSessionToken(sessionToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      user: { select: publicUserSelect },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function revokeSession(sessionToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(sessionToken) },
  });
}
