import test from "node:test";
import assert from "node:assert/strict";
import {
  GeminiProvider,
  GEMINI_PROVENANCE,
  geminiFailure,
  type GeminiClient,
} from "../providers/gemini";
import { buildHECXContext } from "../../lib/mark/hecx/context";
import { emptyState } from "../../lib/mark/store";
import { HecxError } from "../../lib/mark/hecx/contracts";
import { start, account } from "./helpers";
import { backendHECX } from "../services/hecx";
import { users } from "../models/auth";
import { creatorDocuments } from "../models/creators";
const options = {
  apiKey: "unit-test-secret-not-real",
  model: "gemini-test",
  timeoutMs: 1000,
};
const context = () =>
  buildHECXContext(
    { ...structuredClone(emptyState), signedIn: true },
    { module: "Profile Analysis" },
  );
const valid = {
  answer: "Consider completing your profile before analysis.",
  evidenceQuotes: [],
  recommendations: ["Add evidence of your work."],
  priorityActions: [],
  selectedChangeIds: [],
};
function provider(
  output: unknown,
  onRequest?: (
    r: Parameters<GeminiClient["models"]["generateContent"]>[0],
  ) => void,
) {
  return new GeminiProvider(options, {
    models: {
      async generateContent(r) {
        onRequest?.(r);
        return { text: JSON.stringify(output) };
      },
    },
  });
}
test("Gemini uses configured server SDK transport, structured output, and explicit provenance", async () => {
  let calls = 0;
  const result = await provider(valid, (r) => {
    calls++;
    assert.equal(r.model, "gemini-test");
    assert.equal(r.config?.responseMimeType, "application/json");
    assert.ok(r.config?.responseJsonSchema);
    assert.ok(r.config?.abortSignal);
    assert.ok(!JSON.stringify(r).includes(options.apiKey));
  }).analyze(context());
  assert.equal(calls, 1);
  assert.equal(result.provider, GEMINI_PROVENANCE);
  assert.ok(result.gaps.length);
  assert.equal(result.suggestedChanges.length, 0);
});
test("missing Gemini key produces safe configuration error without request", async () => {
  let called = false;
  const p = new GeminiProvider(
    { model: "gemini-test" },
    {
      models: {
        async generateContent() {
          called = true;
          return {};
        },
      },
    },
  );
  await assert.rejects(
    p.smoke(),
    (e) => e instanceof HecxError && e.code === "configuration",
  );
  assert.equal(called, false);
});
test("Gemini rejects malformed, fabricated evidence, unsupported quantities, and invented mutation targets", async () => {
  for (const value of [
    { oops: true },
    { ...valid, evidenceQuotes: ["500 GitHub stars"] },
    { ...valid, answer: "You have 500 GitHub stars." },
    { ...valid, selectedChangeIds: ["invented"] },
  ])
    await assert.rejects(
      provider(value).analyze(context()),
      (e) => e instanceof HecxError && e.code === "invalid",
    );
});
test("Gemini never returns reflected credentials or raw non-JSON output", async () => {
  for (const text of [
    "not JSON",
    JSON.stringify({ ...valid, answer: options.apiKey }),
  ])
    await assert.rejects(
      new GeminiProvider(options, {
        models: {
          async generateContent() {
            return { text };
          },
        },
      }).analyze(context()),
      (e) => e instanceof HecxError && e.code === "invalid",
    );
});
test("field assistance is validated and cannot create an applicable edit without evidence", async () => {
  const good = await provider({
    text: "I build React interfaces.",
    reason: "Reuses the supplied experience.",
    applicable: true,
    evidenceQuotes: ["React"],
  }).suggest("Improve Bio", "I build React interfaces.");
  assert.equal(good.applicable, true);
  await assert.rejects(
    provider({
      text: "Engineer at Google",
      reason: "Invented",
      applicable: true,
      evidenceQuotes: [],
    }).suggest("Improve Bio", ""),
  );
  await assert.rejects(
    provider({
      text: "500 stars",
      reason: "Invented",
      applicable: true,
      evidenceQuotes: ["React"],
    }).suggest("Improve Bio", "React"),
  );
});
test("timeouts, aborts, quota, bad key, model failure and network errors have safe codes", async () => {
  for (const [status, code] of [
    [429, "rate_limit"],
    [403, "configuration"],
    [404, "model_unavailable"],
    [504, "timeout"],
    [500, "unavailable"],
  ] as const) {
    const error = Object.assign(new Error(options.apiKey), { status });
    assert.equal(geminiFailure(error).code, code);
    assert.ok(!geminiFailure(error).message.includes(options.apiKey));
  }
  assert.equal(
    geminiFailure(new Error("API key not valid. Secret value omitted")).code,
    "configuration",
  );
  const hanging = new GeminiProvider(
    { ...options, timeoutMs: 10 },
    { models: { generateContent: () => new Promise(() => {}) } },
  );
  // Keep the test loop alive while AbortSignal.timeout's unreferenced timer expires.
  const timer = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(
      hanging.smoke(),
      (e) => e instanceof HecxError && e.code === "timeout",
    );
  } finally {
    clearTimeout(timer);
  }
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    provider(valid).analyze(context(), controller.signal),
    (e) => e instanceof HecxError && e.code === "cancelled",
  );
});
test("all ten existing modules retain their response contract and do not mutate input", async () => {
  const { hecxModules } = await import("../../lib/mark/hecx/contracts");
  for (const selectedModule of hecxModules) {
    const c = buildHECXContext(
      { ...structuredClone(emptyState), signedIn: true },
      { module: selectedModule },
    );
    const before = JSON.stringify(c);
    const result = await provider(valid).analyze(c);
    assert.equal(result.module, selectedModule);
    assert.equal(JSON.stringify(c), before);
  }
});
test("backend Gemini context includes only the authenticated account, with no unrelated drafts or credentials", async () => {
  const t = await start();
  try {
    const own = await account(t.base),
      other = await account(t.base);
    await fetch(t.base + "/workspace", { headers: other.headers });
    await creatorDocuments.updateOne(
      { _id: other.user.id },
      { $set: { "state.profile.bio": "UNRELATED_PRIVATE_BIO" } },
    );
    const user = (await users.findOne({ _id: own.user.id }))!;
    let seen = false;
    const p = provider(valid, (r) => {
      seen = true;
      const content = String(r.contents);
      assert.ok(!content.includes("UNRELATED_PRIVATE_BIO"));
      assert.ok(!content.includes("passwordHash"));
      assert.ok(!content.includes(user.email));
    });
    const result = await backendHECX(p).analyze(user, {
      module: "Profile Analysis",
    });
    assert.ok(seen);
    assert.equal(result.provider, GEMINI_PROVENANCE);
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
  } finally {
    await t.close();
  }
});
