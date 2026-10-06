import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { requestLog, corsAndOrigin } from "./middleware/security";
import { errorHandler, notFound } from "./middleware/errors";
import { api } from "./routes";
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet(),
    requestLog,
    corsAndOrigin,
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: {
          code: "rate_limit",
          message: "Too many requests. Try again shortly.",
        },
      },
    }),
    express.json({ limit: "8mb" }),
  );
  app.use("/api/v1", api);
  app.use("/api", api);
  app.use(notFound, errorHandler);
  return app;
}
