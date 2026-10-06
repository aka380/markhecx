import test from "node:test";
import assert from "node:assert/strict";
import { start, account } from "./helpers";
import { users, sessions } from "../models/auth";
test("6B registration hashes passwords, persists sessions, rejects forgery and revokes logout", async () => {
  const t = await start();
  try {
    const a = await account(t.base);
    const stored = await users.findOne({ _id: a.user.id });
    assert.ok(
      stored?.passwordHash && !stored.passwordHash.includes("Test-password"),
    );
    const me = await fetch(t.base + "/auth/me", { headers: a.headers });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.role, "Creator");
    assert.equal((await fetch(t.base + "/auth/me")).status, 401);
    assert.equal(
      (
        await fetch(t.base + "/auth/logout", {
          method: "POST",
          headers: { ...a.headers, "x-csrf-token": "bad" },
        })
      ).status,
      403,
    );
    const login = await fetch(t.base + "/auth/login", {
      method: "POST",
      headers: a.headers,
      body: JSON.stringify({
        email: a.user.email,
        password: "Wrong-password-1234",
      }),
    });
    assert.equal(login.status, 401);
    const ok = await fetch(t.base + "/auth/login", {
      method: "POST",
      headers: a.headers,
      body: JSON.stringify({
        email: a.user.email,
        password: "Test-password-1234!",
      }),
    });
    assert.equal(ok.status, 200);
    assert.ok(ok.headers.get("set-cookie")?.includes("HttpOnly"));
    const next = await ok.json();
    const headers = {
      ...a.headers,
      cookie: ok.headers.get("set-cookie")!.split(";")[0],
      "x-csrf-token": next.csrfToken,
    };
    assert.equal(
      (await fetch(t.base + "/auth/me", { headers: a.headers })).status,
      401,
    );
    assert.equal(
      (await fetch(t.base + "/auth/logout", { method: "POST", headers }))
        .status,
      204,
    );
    assert.equal((await fetch(t.base + "/auth/me", { headers })).status, 401);
    await users.deleteOne({ _id: a.user.id });
    await sessions.deleteMany({ userId: a.user.id });
  } finally {
    await t.close();
  }
});
