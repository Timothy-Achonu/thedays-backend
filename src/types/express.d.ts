import type { AuthenticatedUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: AuthenticatedUser;
        sessionToken: string;
      };
    }
  }
}

export {};
