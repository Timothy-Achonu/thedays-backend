import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { originProtection } from "./middleware/origin-protection.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(originProtection);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
