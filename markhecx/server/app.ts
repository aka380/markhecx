import express from "express";
import { productionRateStore } from "./middleware/rate-store";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { requestLog, corsAndOrigin } from "./middleware/security";
import { errorHandler, notFound } from "./middleware/errors";
import { api } from "./routes";
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Vercel supplies the trusted client IP on the direct request.
  if (process.env.VERCEL) app.set("trust proxy", 1);
  app.use(
    helmet(),
    requestLog,
    corsAndOrigin,
    rateLimit({
      windowMs: 60000,
      store: productionRateStore("api"),
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
