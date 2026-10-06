import { db } from "./database";
export interface User {
  _id: string;
  email: string;
  name: string;
  role: "Creator" | "Brand";
  passwordHash: string;
  createdAt: Date;
}
export interface Session {
  _id: string;
  userId: string;
  csrfToken: string;
  expiresAt: Date;
}
export const users = db.collection<User>("users");
export const sessions = db.collection<Session>("sessions");
export async function authIndexes() {
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
