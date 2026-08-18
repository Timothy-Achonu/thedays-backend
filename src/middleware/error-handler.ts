import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { formatZodError } from "../utils/format-zod-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: formatZodError(error),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  if (env.NODE_ENV !== "test") {
    console.error(error);
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};
