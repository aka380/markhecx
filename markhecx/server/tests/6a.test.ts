import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app";
import { connectDatabase, client } from "../models/database";
test("6A database, health, origin boundaries, malformed JSON and safe errors", async () => {
  await connectDatabase();
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const r = await fetch(base + "/api/health");
    assert.equal(r.status, 200);
    assert.equal((await r.json()).database, "connected");
    assert.equal((await fetch(base + "/api/missing")).status, 404);
    assert.equal(
      (
        await fetch(base + "/api/health", {
          headers: { origin: "https://attacker.example" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/missing", {
          method: "POST",
          headers: {
            origin: "http://127.0.0.1:3001",
            "content-type": "application/json",
          },
          body: "bad",
        })
      ).status,
      400,
    );
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await client.close();
  }
});
