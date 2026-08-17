import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function originProtection(request: Request, _response: Response, next: NextFunction): void {
  const origin = request.get("origin");

  if (!SAFE_METHODS.has(request.method) && origin && origin !== env.FRONTEND_URL) {
    throw new AppError(403, "INVALID_ORIGIN", "Request origin is not allowed");
  }

  next();
}
