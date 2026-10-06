import test from "node:test";
import assert from "node:assert/strict";
import { start, account } from "./helpers";
import { backendHECX } from "../services/hecx";
import { MockHECXProvider } from "../../lib/mark/hecx/mock-provider";
import { users } from "../models/auth";
test("6E HECX derives context from authenticated database records and validates provider output", async () => {
  const t = await start();
  try {
    const a = await account(t.base);
    const result = await fetch(t.base + "/hecx/analyze", {
      method: "POST",
      headers: a.headers,
      body: JSON.stringify({ module: "Skill Analysis" }),
    });
    assert.equal(result.status, 200);
    const body = await result.json();
    assert.ok(body.requiresUserInput.length > 0);
    assert.equal(body.suggestedChanges.length, 0);
    assert.equal(
      (
        await fetch(t.base + "/hecx/analyze", {
          method: "POST",
          headers: a.headers,
          body: JSON.stringify({
            module: "Profile Analysis",
            state: { profile: { skills: ["Invented"] } },
          }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(t.base + "/hecx/analyze", {
          method: "POST",
          headers: {
            origin: "http://127.0.0.1:3001",
            "content-type": "application/json",
          },
          body: JSON.stringify({ module: "AI Chat" }),
        })
      ).status,
      401,
    );
    const user = (await users.findOne({ _id: a.user.id }))!;
    await assert.rejects(
      backendHECX({
        ...MockHECXProvider,
        analyze: async () => ({ invented: true }),
      }).analyze(user, { module: "Profile Analysis" }),
    );
    const missing = await fetch(t.base + "/hecx/matches/missing", {
      headers: a.headers,
    });
    assert.equal(missing.status, 404);
    assert.ok(!JSON.stringify(body).includes("passwordHash"));
  } finally {
    await t.close();
  }
});
