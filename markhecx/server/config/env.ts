import { configuredWebOrigins } from "../runtime-config";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z
    .string()
    .default("mongodb://127.0.0.1:27018/?replicaSet=markhecx"),
  MONGODB_DATABASE: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default("markhecx"),
  WEB_ORIGINS: z
    .string()
    .default(
      "http://127.0.0.1:3001",
    ),
  GOOGLE_CLIENT_ID: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["disabled", "resend"]).default("disabled"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z
    .string()
    .regex(/^gemini-[a-zA-Z0-9.-]+$/)
    .default("gemini-3.5-flash-lite"),
  HECX_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(25000),
  HECX_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
});
export const config = schema.parse({ ...process.env, WEB_ORIGINS: configuredWebOrigins(process.env) });
export const origins = config.WEB_ORIGINS.split(",").map(
  (x) => new URL(x.trim()).origin,
);
if (
  config.NODE_ENV === "production" &&
  origins.some((o) => !o.startsWith("https://"))
)
  throw Error("Production web origins must use HTTPS.");

if (
  (config.NODE_ENV === "test") !==
  (config.MONGODB_DATABASE === "markhecx_test")
)
  throw Error(
    "Test mode must use markhecx_test; normal application mode must use a different database.",
  );

if (config.NODE_ENV === "development")
  for (const origin of [...origins]) {
    const u = new URL(origin);
    if (u.hostname === "127.0.0.1" || u.hostname === "localhost") {
      u.hostname = u.hostname === "localhost" ? "127.0.0.1" : "localhost";
      if (!origins.includes(u.origin)) origins.push(u.origin);
    }
  }
