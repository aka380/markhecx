import { passwordReset } from "../services/password-reset";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { config } from "../config/env";
import { publicUser, sessions } from "../models/auth";
import { register, login, newSession, tokenHash } from "../services/auth";
import { authenticate, sessionToken } from "../middleware/auth";
export const authRoutes = Router();
const credentials = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128),
  })
  .strict();
const registration = credentials.extend({
  name: z.string().trim().min(1).max(60),
  role: z.enum(["Creator", "Brand"]),
});
const limiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "rate_limit",
      message: "Too many sign-in attempts. Try again later.",
    },
  },
});
for (const path of ["register", "login"] as const)
  authRoutes.post(`/${path}`, limiter, async (req, res) => {
    const user =
      path === "register"
        ? await register(registration.parse(req.body))
        : await (async () => {
            const i = credentials.parse(req.body);
            return login(i.email, i.password);
          })();
    const previous = sessionToken(req);
    if (previous) await sessions.deleteOne({ _id: tokenHash(previous) });
    const session = await newSession(user._id, user.credentialsVersion || 0);
    res.cookie("markhecx_session", session.token, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api",
      expires: session.expiresAt,
    });
    res
      .status(path === "register" ? 201 : 200)
      .json({ user: publicUser(user), csrfToken: session.csrfToken });
  });
authRoutes.get("/me", authenticate, (_req, res) => {
  res.json({
    user: publicUser(res.locals.user),
    csrfToken: res.locals.session.csrfToken,
  });
});
authRoutes.post("/logout", authenticate, async (_req, res) => {
  await sessions.deleteOne({ _id: res.locals.session._id });
  res.clearCookie("markhecx_session", {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
  });
  res.sendStatus(204);
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "rate_limit",
      message: "Too many recovery attempts. Try again later.",
    },
  },
});
const emailInput = z
  .object({ email: z.string().trim().email().max(254) })
  .strict();
for (const path of ["forgot-password", "resend-reset-otp"])
  authRoutes.post("/" + path, resetLimiter, async (req, res) => {
    await passwordReset.request(emailInput.parse(req.body).email);
    res.json({
      message:
        "If this email has an account, a reset code will be sent. Please wait at least 60 seconds before requesting another code.",
    });
  });
authRoutes.post("/verify-reset-otp", resetLimiter, async (req, res) => {
  const body = emailInput
    .extend({ otp: z.string().regex(/^\d{6}$/) })
    .parse(req.body);
  res.json({ resetToken: await passwordReset.verify(body.email, body.otp) });
});
authRoutes.post("/reset-password", resetLimiter, async (req, res) => {
  const body = z
    .object({
      resetToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      password: z.string().min(12).max(128),
    })
    .strict()
    .parse(req.body);
  await passwordReset.reset(body.resetToken, body.password);
  res.json({ message: "Password changed. Sign in with your new password." });
});
