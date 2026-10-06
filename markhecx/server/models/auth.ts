import { db } from "./database";
export interface User {
  credentialsVersion?: number;
  _id: string;
  email: string;
  name: string;
  role: "Creator" | "Brand";
  passwordHash?: string;
  provider?: "password" | "google" | "password+google";
  googleSubject?: string;
  updatedAt?: Date;
  createdAt: Date;
}
export interface Session {
  credentialsVersion?: number;
  _id: string;
  userId: string;
  csrfToken: string;
  expiresAt: Date;
}
export const users = db.collection<User>("users");
export const sessions = db.collection<Session>("sessions");
export async function authIndexes() {
  await users.createIndex(
    { googleSubject: 1 },
    {
      unique: true,
      partialFilterExpression: { googleSubject: { $type: "string" } },
    },
  );
  await googleChallenges.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await passwordResets.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 3600 },
  );
  await passwordResets.createIndex(
    { tokenHash: 1 },
    {
      unique: true,
      partialFilterExpression: { tokenHash: { $type: "string" } },
    },
  );
  await users.createIndex({ email: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await sessions.createIndex({ userId: 1 });
}
export const publicUser = (user: User) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  role: user.role,
});

export interface PasswordReset {
  _id: string;
  userId: string | null;
  generation: string;
  otpHash: string;
  attempts: number;
  sentAt: Date;
  expiresAt: Date;
  windowStart: Date;
  requests: number;
  tokenHash: string | null;
  tokenExpiresAt: Date | null;
  verified: boolean;
}
export const passwordResets = db.collection<PasswordReset>("password_resets");

export const googleChallenges = db.collection<{
  _id: string;
  nonceHash: string;
  expiresAt: Date;
}>("google_challenges");
