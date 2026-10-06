import { memoryIndexes } from "../models/memory";
import { notificationIndexes } from "../models/notifications";
import { marketIndexes } from "../models/marketplace";
import { creatorIndexes } from "../models/creators";
import { createApp } from "../app";
import { connectDatabase, client } from "../models/database";
import { authIndexes } from "../models/auth";
export async function start() {
  if (process.env.MONGODB_DATABASE !== "markhecx_test")
    throw Error("Tests require the isolated test database.");
  await connectDatabase();
  await authIndexes();
  await memoryIndexes();
  await creatorIndexes();
  await marketIndexes();
  await notificationIndexes();
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1`;
  return {
    base,
    close: async () => {
      await new Promise<void>((r) => server.close(() => r()));
      await client.close();
    },
  };
}
export async function account(base: string, role = "Creator") {
  const response = await fetch(base + "/auth/register", {
    method: "POST",
    headers: {
      origin: "http://127.0.0.1:3001",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: `${crypto.randomUUID()}@test.example`,
      password: "Test-password-1234!",
      name: "Test Account",
      role,
    }),
  });
  const body = (await response.json()) as {
    user: import("../../lib/mark/api/client").SessionUser;
    csrfToken: string;
  };
  if (response.status !== 201) throw Error(JSON.stringify(body));
  return {
    user: body.user,
    headers: {
      origin: "http://127.0.0.1:3001",
      "content-type": "application/json",
      cookie: response.headers.get("set-cookie")!.split(";")[0],
      "x-csrf-token": body.csrfToken,
    },
  };
}
