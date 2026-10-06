import {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { users, sessions, User } from "../models/auth";
import { config } from "../config/env";
import { ApiError } from "../middleware/errors";
const derive = promisify(scrypt);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await derive(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, value] = stored.split(":");
  const expected = Buffer.from(value, "hex");
  const actual = (await derive(password, salt, 64)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function register(input: {
  email: string;
  name: string;
  password: string;
  role: User["role"];
}) {
  const user: User = {
    _id: randomUUID(),
    email: input.email.toLowerCase(),
    name: input.name.trim(),
    role: input.role,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date(),
  };
  await users.insertOne(user);
  return user;
}
export async function login(email: string, password: string) {
  const user = await users.findOne({ email: email.toLowerCase() });
  const valid = await verifyPassword(
    password,
    user?.passwordHash || `${"0".repeat(32)}:${"0".repeat(128)}`,
  );
  if (!user || !valid)
    throw new ApiError(
      401,
      "invalid_credentials",
      "Email or password is incorrect.",
    );
  return user;
}
export async function newSession(userId: string) {
  const token = randomBytes(32).toString("base64url"),
    csrfToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.SESSION_DAYS * 86400000);
  await sessions.insertOne({
    _id: tokenHash(token),
    userId,
    csrfToken,
    expiresAt,
  });
  return { token, csrfToken, expiresAt };
}
