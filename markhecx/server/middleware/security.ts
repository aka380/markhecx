import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { origins } from "../config/env";
import { ApiError } from "./errors";
export const requestLog: RequestHandler = (req, res, next) => {
  res.locals.requestId = randomUUID();
  res.setHeader("X-Request-ID", res.locals.requestId);
  const start = Date.now();
  res.on("finish", () =>
    console.log(
      JSON.stringify({
        requestId: res.locals.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      }),
    ),
  );
  next();
};
export const corsAndOrigin: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  if (origin && !origins.includes(origin))
    return next(
      new ApiError(403, "origin_denied", "This origin is not allowed."),
    );
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !origin)
    return next(
      new ApiError(
        403,
        "origin_required",
        "An allowed Origin header is required.",
      ),
    );
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-CSRF-Token, X-Account-ID",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  next();
};
