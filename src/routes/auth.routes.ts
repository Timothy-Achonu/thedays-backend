import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { login, logout, me, register, resendVerification, verifyEmail } from "../controllers/auth.controller.js";
import { requireAuthentication } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import {
  loginBodySchema,
  registerBodySchema,
  resendVerificationBodySchema,
  verifyEmailBodySchema,
} from "../validators/auth.schemas.js";

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again later.",
    },
  },
});

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validate({ body: registerBodySchema }), register);
authRouter.post("/verify-email", authRateLimiter, validate({ body: verifyEmailBodySchema }), verifyEmail);
authRouter.post(
  "/resend-verification",
  authRateLimiter,
  validate({ body: resendVerificationBodySchema }),
  resendVerification,
);
authRouter.post("/login", authRateLimiter, validate({ body: loginBodySchema }), login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuthentication, me);
