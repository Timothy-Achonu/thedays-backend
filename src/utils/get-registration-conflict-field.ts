export type RegistrationConflictField = "username" | "email";

function normalizeToken(value: string): string {
  return value.toLowerCase().replaceAll('"', "").trim();
}

function collectConstraintTokens(error: unknown): string[] {
  if (typeof error !== "object" || error === null || !("meta" in error)) {
    return [];
  }

  const meta = (error as { meta?: Record<string, unknown> }).meta;
  if (!meta) {
    return [];
  }

  const tokens: string[] = [];

  const target = meta.target;
  if (Array.isArray(target)) {
    for (const value of target) {
      if (typeof value === "string") {
        tokens.push(normalizeToken(value));
      }
    }
  } else if (typeof target === "string") {
    tokens.push(normalizeToken(target));
  }

  const driverAdapterError = meta.driverAdapterError;
  if (typeof driverAdapterError === "object" && driverAdapterError !== null && "cause" in driverAdapterError) {
    const cause = (driverAdapterError as { cause?: Record<string, unknown> }).cause;
    const constraint = cause?.constraint;

    if (typeof constraint === "object" && constraint !== null) {
      const fields = (constraint as { fields?: unknown; index?: unknown }).fields;
      if (Array.isArray(fields)) {
        for (const value of fields) {
          if (typeof value === "string") {
            tokens.push(normalizeToken(value));
          }
        }
      }

      const index = (constraint as { index?: unknown }).index;
      if (typeof index === "string") {
        tokens.push(normalizeToken(index));
      }
    }
  }

  return tokens;
}

function classifyToken(token: string): RegistrationConflictField | null {
  if (token.includes("username")) {
    return "username";
  }

  if (token.includes("email")) {
    return "email";
  }

  return null;
}

export function getRegistrationConflictField(error: unknown): RegistrationConflictField | null {
  for (const token of collectConstraintTokens(error)) {
    const field = classifyToken(token);
    if (field) {
      return field;
    }
  }

  return null;
}
