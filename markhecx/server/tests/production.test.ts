import test from "node:test";
import assert from "node:assert/strict";
import { start, account } from "./helpers";
import { users, sessions, passwordResets } from "../models/auth";
import { creatorDocuments } from "../models/creators";
import { memories } from "../models/memory";
import { testEmail } from "../providers/email";
import { tokenHash } from "../services/auth";
import { blankProject } from "../../lib/mark/models";
import { creativeSchema } from "../../lib/mark/creative";
import { publishPortfolio } from "../../lib/mark/domain";
import { backendHECX } from "../services/hecx";
import { MockHECXProvider } from "../../lib/mark/hecx/mock-provider";
import { GeminiProvider } from "../providers/gemini";
import { blankCampaign } from "../../lib/mark/marketplace/models";
import { campaigns } from "../models/marketplace";

test("password recovery: real HTTP OTP delivery, cooldown, one use, session revocation and new login", async () => {
  const t = await start();
  let id = "";
  testEmail.clear();
  try {
    const a = await account(t.base);
    id = a.user.id;
    const call = (path: string, body: unknown) =>
      fetch(t.base + "/auth/" + path, {
        method: "POST",
        headers: a.headers,
        body: JSON.stringify(body),
      });
    const first = await call("forgot-password", { email: a.user.email });
    assert.equal(first.status, 200);
    const text = await first.text();
    assert.ok(!text.includes("resetToken"));
    const absent = await call("forgot-password", {
      email: "absent-" + crypto.randomUUID() + "@test.example",
    });
    assert.equal(await absent.text(), text);
    assert.equal(testEmail.messages.length, 2);
    const otp = testEmail.messages[0].text.match(/\b\d{6}\b/)![0];
    const row = await passwordResets.findOne({ _id: tokenHash(a.user.email) });
    assert.ok(row);
    assert.ok(!JSON.stringify(row).includes(otp));
    assert.equal(row.expiresAt.getTime() - row.sentAt.getTime(), 600000);
    await call("resend-reset-otp", { email: a.user.email });
    assert.equal(testEmail.messages.length, 2);
    assert.equal(
      (
        await call("verify-reset-otp", {
          email: a.user.email,
          otp: otp === "000000" ? "000001" : "000000",
        })
      ).status,
      400,
    );
    const verified = await call("verify-reset-otp", {
      email: a.user.email,
      otp,
    });
    assert.equal(verified.status, 200);
    const { resetToken } = await verified.json();
    assert.equal(
      (await call("verify-reset-otp", { email: a.user.email, otp })).status,
      400,
    );
    assert.equal(
      (
        await call("reset-password", {
          resetToken,
          password: "New-test-password-1234!",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await call("reset-password", {
          resetToken,
          password: "Another-password-1234!",
        })
      ).status,
      400,
    );
    assert.equal(
      (await fetch(t.base + "/auth/me", { headers: a.headers })).status,
      401,
    );
    assert.equal(
      (
        await call("login", {
          email: a.user.email,
          password: "Test-password-1234!",
        })
      ).status,
      401,
    );
    const login = await call("login", {
      email: a.user.email,
      password: "New-test-password-1234!",
    });
    assert.equal(login.status, 200);
    const body = await login.json(),
      headers = {
        ...a.headers,
        cookie: login.headers.get("set-cookie")!.split(";")[0],
        "x-csrf-token": body.csrfToken,
      };
    assert.equal((await fetch(t.base + "/auth/me", { headers })).status, 200);
    assert.equal(
      (await fetch(t.base + "/auth/logout", { method: "POST", headers }))
        .status,
      204,
    );
  } finally {
    testEmail.clear();
    if (id) {
      await users.deleteOne({ _id: id });
      await sessions.deleteMany({ userId: id });
      await passwordResets.deleteMany({ userId: id });
    }
    await t.close();
  }
});

test("OTP attempts, expiration, resend invalidation and token expiration fail closed", async () => {
  const t = await start();
  let id = "";
  testEmail.clear();
  try {
    const a = await account(t.base);
    id = a.user.id;
    const email = a.user.email,
      key = tokenHash(email),
      call = (path: string, body: unknown) =>
        fetch(t.base + "/auth/" + path, {
          method: "POST",
          headers: a.headers,
          body: JSON.stringify(body),
        });
    await call("forgot-password", { email });
    const otp = testEmail.messages.at(-1)!.text.match(/\b\d{6}\b/)![0];
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await call("verify-reset-otp", {
            email,
            otp: otp === "000000" ? "000001" : "000000",
          })
        ).status,
        400,
      );
    assert.equal((await call("verify-reset-otp", { email, otp })).status, 400);
    await passwordResets.updateOne(
      { _id: key },
      { $set: { sentAt: new Date(Date.now() - 61000) } },
    );
    await call("resend-reset-otp", { email });
    assert.equal(testEmail.messages.length, 2);
    const fresh = testEmail.messages.at(-1)!.text.match(/\b\d{6}\b/)![0];
    await passwordResets.updateOne(
      { _id: key },
      { $set: { expiresAt: new Date(0) } },
    );
    assert.equal(
      (await call("verify-reset-otp", { email, otp: fresh })).status,
      400,
    );
    await passwordResets.updateOne(
      { _id: key },
      { $set: { expiresAt: new Date(Date.now() + 600000) } },
    );
    const verified = await call("verify-reset-otp", { email, otp: fresh });
    assert.equal(verified.status, 200);
    const { resetToken } = await verified.json();
    await passwordResets.updateOne(
      { _id: key },
      { $set: { tokenExpiresAt: new Date(0) } },
    );
    assert.equal(
      (
        await call("reset-password", {
          resetToken,
          password: "New-password-123456!",
        })
      ).status,
      400,
    );
  } finally {
    testEmail.clear();
    await users.deleteOne({ _id: id });
    await sessions.deleteMany({ userId: id });
    await passwordResets.deleteMany({ userId: id });
    await t.close();
  }
});

test("persisted creative fields, backend search, memory isolation and two-stage matching", async () => {
  const t = await start();
  const ids: string[] = [];
  let campaignId = "";
  try {
    const a = await account(t.base),
      b = await account(t.base, "Brand"),
      other = await account(t.base, "Brand");
    ids.push(a.user.id, b.user.id, other.user.id);
    const call = (
      path: string,
      method = "GET",
      body?: unknown,
      headers = a.headers,
    ) =>
      fetch(t.base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    let w = await (await call("/workspace")).json();
    const marker = "Studio-" + crypto.randomUUID().slice(0, 8);
    w.state.profile = {
      ...w.state.profile,
      name: marker,
      username: marker.toLowerCase(),
      identity: "AI Video Creator",
      skills: ["Editing", "Storytelling", "Video"].map((name) => ({
        id: name,
        name,
        category: "Design",
      })),
      creative: creativeSchema.parse({
        tools: ["Blender"],
        models: ["Local model"],
        contentTypes: ["Video"],
        platforms: ["Instagram"],
        formats: ["Reel"],
        commercialUse: "Available",
        minimumBudget: 100,
      }),
    };
    const project = {
      ...blankProject(),
      title: "Product study",
      creative: w.state.profile.creative,
      status: "Published" as const,
    };
    w.state.projects = [project];
    w.state.portfolio.visibility = "Public";
    w.state.publication = publishPortfolio(
      w.state.portfolio,
      w.state.profile,
      w.state.projects,
    );
    const saved = await call("/workspace", "PUT", {
      state: w.state,
      revision: w.revision,
    });
    assert.equal(saved.status, 200);
    w = await saved.json();
    assert.equal(
      (await creatorDocuments.findOne({ _id: a.user.id }))?.state.projects[0]
        .creative?.tools[0],
      "Blender",
    );
    const found = await (
      await call(
        "/creators/search?q=" +
          marker +
          "&tool=Blender&platform=Instagram&limit=1",
      )
    ).json();
    assert.equal(found.total, 1);
    assert.equal(found.creators[0].id, a.user.id);
    assert.equal(
      (
        await (
          await call("/creators/search?q=" + marker + "&tool=Unknown")
        ).json()
      ).total,
      0,
    );
    assert.equal((await call("/creators/search?page=-1")).status, 400);
    assert.equal(
      (await call("/hecx/memory/goal", "PUT", { value: "Make short films" }))
        .status,
      200,
    );
    assert.equal(
      (await (await call("/hecx/memory", "GET", undefined, b.headers)).json())
        .memories.length,
      0,
    );
    const user = (await users.findOne({ _id: a.user.id }))!;
    let saw = false;
    await backendHECX({
      ...MockHECXProvider,
      async analyze(context, signal) {
        saw = true;
        assert.equal(context.preferences?.[0].value, "Make short films");
        return MockHECXProvider.analyze(context, signal);
      },
    }).analyze(user, { module: "Profile Analysis" });
    assert.ok(saw);
    assert.equal((await call("/hecx/memory/goal", "DELETE")).status, 204);
    assert.equal(await memories.countDocuments({ userId: a.user.id }), 0);
    const c = {
      ...blankCampaign(b.user.id),
      title: "Video launch",
      status: "Published" as const,
      tools: ["Blender"],
      contentType: "Video",
      format: "Reel",
      commercialUse: "Available" as const,
      platforms: ["Instagram"],
      budget: 200,
    };
    campaignId = c.id;
    await campaigns.insertOne({ _id: c.id, data: c });
    const result = await call(
      "/hecx/match-explanation",
      "POST",
      { campaignId: c.id, creatorId: a.user.id },
      b.headers,
    );
    assert.equal(result.status, 200);
    const m = await result.json();
    assert.ok(
      m.match.factors.some(
        (f: { key: string; value: number }) =>
          f.key === "tools" && f.value === 1,
      ),
    );
    assert.equal(
      (
        await call(
          "/hecx/match-explanation",
          "POST",
          { campaignId: c.id, creatorId: a.user.id },
          other.headers,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await call(
          "/hecx/brief",
          "POST",
          { prompt: "A video launch" },
          a.headers,
        )
      ).status,
      403,
    );
    assert.equal((await call("/projects/" + project.id, "DELETE")).status, 200);
    assert.equal((await (await call("/projects")).json()).projects.length, 0);
  } finally {
    for (const id of ids) {
      await users.deleteOne({ _id: id });
      await sessions.deleteMany({ userId: id });
      await creatorDocuments.deleteOne({ _id: id });
      await memories.deleteMany({ userId: id });
    }
    if (campaignId) await campaigns.deleteOne({ _id: campaignId });
    await t.close();
  }
});

test("Gemini brief draft is structured, rejects extra fields and never persists", async () => {
  const draft = {
    contentType: "Video",
    style: "cinematic",
    platform: "Instagram",
    format: "",
    aspectRatio: "",
    commercialUse: "Unspecified",
    requirements: [],
  };
  const make = (raw: unknown) =>
    new GeminiProvider(
      { apiKey: "test-only", model: "gemini-test" },
      {
        models: {
          async generateContent() {
            return { text: JSON.stringify(raw) };
          },
        },
      },
    );
  assert.deepEqual(await make(draft).brief("Cinematic Instagram video"), draft);
  await assert.rejects(() =>
    make({ ...draft, budget: 10000 }).brief("Cinematic Instagram video"),
  );
});
