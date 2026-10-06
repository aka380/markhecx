import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { config } from "../config/env";
import { users, googleChallenges, type User } from "../models/auth";
import { tokenHash } from "./auth";
import { ApiError } from "../middleware/errors";
const invalid = () =>
  new ApiError(
    401,
    "google_invalid",
    "Google authentication could not be verified. Try again.",
  );
export type GoogleVerifier = (
  token: string,
  audience: string,
) => Promise<TokenPayload | undefined>;
const client = new OAuth2Client();
export const verifyGoogle: GoogleVerifier = async (token, audience) => {
  try {
    return (
      await client.verifyIdToken({ idToken: token, audience })
    ).getPayload();
  } catch {
    throw invalid();
  }
};
export async function googleChallenge(clientId = config.GOOGLE_CLIENT_ID) {
  if (!clientId)
    throw new ApiError(
      503,
      "google_unconfigured",
      "Google Sign-In is not configured on this server.",
    );
  const cookie = randomBytes(32).toString("base64url"),
    nonce = randomBytes(32).toString("base64url");
  await googleChallenges.insertOne({
    _id: tokenHash(cookie),
    nonceHash: tokenHash(nonce),
    expiresAt: new Date(Date.now() + 300000),
  });
  return { cookie, nonce, clientId };
}
export function googleAuthService(
  verify: GoogleVerifier = verifyGoogle,
  audience = config.GOOGLE_CLIENT_ID,
) {
  return async (
    token: string,
    nonce: string,
    role: User["role"],
    linkUserId?: string,
  ) => {
    if (!audience)
      throw new ApiError(
        503,
        "google_unconfigured",
        "Google Sign-In is not configured on this server.",
      );
    const p = await verify(token, audience),
      now = Math.floor(Date.now() / 1000);
    if (
      !p ||
      !["accounts.google.com", "https://accounts.google.com"].includes(p.iss) ||
      p.aud !== audience ||
      !p.exp ||
      p.exp <= now ||
      !p.iat ||
      p.iat > now + 60 ||
      !p.sub ||
      p.sub.length > 255 ||
      p.email_verified !== true ||
      !z.string().email().safeParse(p.email).success ||
      (p as TokenPayload & { nonce?: string }).nonce !== nonce
    )
      throw invalid();
    const email = p.email!.trim().toLowerCase();
    let user = await users.findOne({ googleSubject: p.sub });
    if (user) {
      if (linkUserId && linkUserId !== user._id)
        throw new ApiError(
          409,
          "google_link_conflict",
          "This Google identity belongs to another account.",
        );
      return user;
    }
    user = await users.findOne({ email });
    if (user) {
      if (!linkUserId || user._id !== linkUserId)
        throw new ApiError(
          409,
          "google_link_required",
          "Sign in with your existing MarkHECX account, then link Google from Settings.",
        );
      const linked = await users.findOneAndUpdate(
        { _id: user._id, googleSubject: { $exists: false } },
        {
          $set: {
            googleSubject: p.sub,
            provider: user.passwordHash ? "password+google" : "google",
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      );
      if (!linked)
        throw new ApiError(
          409,
          "google_link_conflict",
          "This account already has a Google identity.",
        );
      return linked;
    }
    if (linkUserId)
      throw new ApiError(
        409,
        "google_link_conflict",
        "Use the Google identity with your existing account email.",
      );
    const created: User = {
      _id: randomUUID(),
      email,
      name: (p.name || email.split("@")[0]).slice(0, 60),
      role,
      provider: "google",
      googleSubject: p.sub,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      await users.insertOne(created);
      return created;
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        const same = await users.findOne({ googleSubject: p.sub });
        if (same) return same;
        throw new ApiError(
          409,
          "google_link_required",
          "Sign in with your existing MarkHECX account, then link Google from Settings.",
        );
      }
      throw e;
    }
  };
}
export const googleSignIn = googleAuthService();

export async function consumeGoogleChallenge(cookie: string, nonce: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(cookie)) return false;
  return !!(await googleChallenges.findOneAndDelete({
    _id: tokenHash(cookie),
    nonceHash: tokenHash(nonce),
    expiresAt: { $gt: new Date() },
  }));
}
