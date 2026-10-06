import { randomInt, randomBytes } from "node:crypto";
import { passwordResets, users, sessions } from "../models/auth";
import { client } from "../models/database";
import { hashPassword, verifyPassword, tokenHash } from "./auth";
import {
  emailProvider,
  assertEmailAvailable,
  type EmailProvider,
} from "../providers/email";
import { ApiError } from "../middleware/errors";
const invalid = () =>
  new ApiError(
    400,
    "invalid_reset",
    "The code or reset session is invalid or expired. Request a new code.",
  );
export function passwordResetService(email: EmailProvider = emailProvider) {
  return {
    async request(address: string) {
      if (email === emailProvider) assertEmailAvailable();
      const normalized = address.trim().toLowerCase(),
        id = tokenHash(normalized),
        now = new Date();
      const user = await users.findOne({ email: normalized });
      const otp = String(randomInt(0, 1000000)).padStart(6, "0");
      const otpHash = await hashPassword(otp);
      const previous = await passwordResets.findOne({ _id: id });
      if (
        previous &&
        (previous.sentAt.getTime() > now.getTime() - 60000 ||
          (previous.windowStart.getTime() > now.getTime() - 3600000 &&
            previous.requests >= 5))
      )
        return;
      const generation = randomBytes(16).toString("hex");
      const row = {
        _id: id,
        userId: user?._id || null,
        generation,
        otpHash,
        attempts: 0,
        sentAt: now,
        expiresAt: new Date(now.getTime() + 600000),
        windowStart:
          previous && previous.windowStart.getTime() > now.getTime() - 3600000
            ? previous.windowStart
            : now,
        requests:
          previous && previous.windowStart.getTime() > now.getTime() - 3600000
            ? previous.requests + 1
            : 1,
        tokenHash: null,
        tokenExpiresAt: null,
        verified: false,
      };
      try {
        if (previous) {
          const r = await passwordResets.replaceOne(
            { _id: id, generation: previous.generation },
            row,
          );
          if (!r.modifiedCount) return;
        } else await passwordResets.insertOne(row);
      } catch (e) {
        if ((e as { code?: number }).code === 11000) return;
        throw e;
      }
      // Delivery is asynchronous for the same response path/timing on existing and unknown accounts.
      if (user)
        void email
          .send({
            to: normalized,
            subject: "Your MarkHECX password reset code",
            text: `Your MarkHECX code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
          })
          .catch(async () => {
            await passwordResets
              .deleteOne({ _id: id, generation })
              .catch(() => {});
            console.error(
              JSON.stringify({ event: "password_reset_delivery_failed" }),
            );
          });
    },
    async verify(address: string, otp: string) {
      const id = tokenHash(address.trim().toLowerCase()),
        now = new Date();
      const record = await passwordResets.findOneAndUpdate(
        {
          _id: id,
          verified: false,
          expiresAt: { $gt: now },
          attempts: { $lt: 5 },
        },
        { $inc: { attempts: 1 } },
        { returnDocument: "after" },
      );
      const valid = await verifyPassword(
        otp,
        record?.otpHash || `${"0".repeat(32)}:${"0".repeat(128)}`,
      );
      if (!record || !valid || !record.userId) throw invalid();
      const token = randomBytes(32).toString("base64url");
      const changed = await passwordResets.updateOne(
        {
          _id: id,
          generation: record.generation,
          verified: false,
          expiresAt: { $gt: new Date() },
        },
        {
          $set: {
            verified: true,
            otpHash: "",
            tokenHash: tokenHash(token),
            tokenExpiresAt: new Date(Date.now() + 600000),
          },
        },
      );
      if (!changed.modifiedCount) throw invalid();
      return token;
    },
    async reset(token: string, password: string) {
      const hashed = await hashPassword(password),
        session = client.startSession();
      try {
        await session.withTransaction(async () => {
          const record = await passwordResets.findOneAndDelete(
            {
              tokenHash: tokenHash(token),
              verified: true,
              tokenExpiresAt: { $gt: new Date() },
            },
            { session },
          );
          if (!record?.userId) throw invalid();
          const changed = await users.updateOne(
            { _id: record.userId },
            { $set: { passwordHash: hashed }, $inc: { credentialsVersion: 1 } },
            { session },
          );
          if (!changed.matchedCount) throw invalid();
          await sessions.deleteMany({ userId: record.userId }, { session });
        });
      } finally {
        await session.endSession();
      }
    },
  };
}
export const passwordReset = passwordResetService();
