/** Opt-in real Gemini + real MongoDB test. Never operates on the application database. */
import assert from "node:assert/strict";
import { start, account } from "../server/tests/helpers";
import { api, setCSRF } from "../lib/mark/api/client";
import { users, sessions, passwordResets } from "../server/models/auth";
import { creatorDocuments } from "../server/models/creators";
import { brands, campaigns, preferences, activity } from "../server/models/marketplace";
import { memories } from "../server/models/memory";
import { config } from "../server/config/env";
import { GeminiProvider } from "../server/providers/gemini";
import {
  blankCampaign,
  type MarketplaceState,
} from "../lib/mark/marketplace/models";
import { blankProject } from "../lib/mark/models";
import { creativeSchema } from "../lib/mark/creative";
import { publishPortfolio } from "../lib/mark/domain";
import type { AppState } from "../lib/mark/store";
import type { HecxResult } from "../lib/mark/hecx/contracts";
import { testEmail } from "../server/providers/email";
if (
  config.HECX_PROVIDER !== "gemini" ||
  config.NODE_ENV !== "test" ||
  config.MONGODB_DATABASE !== "markhecx_test"
)
  throw Error("Smoke requires Gemini and isolated test mode/database.");
const t = await start(),
  nativeFetch = globalThis.fetch,
  previous = process.env.NEXT_PUBLIC_API_URL,
  ids: string[] = [];
let campaignId = "";
try {
  await new GeminiProvider({
    apiKey: config.GEMINI_API_KEY,
    model: config.GEMINI_MODEL,
  }).smoke();
  const creator = await account(t.base),
    brand = await account(t.base, "Brand");
  ids.push(creator.user.id, brand.user.id);
  let active = creator;
  process.env.NEXT_PUBLIC_API_URL = t.base;
  globalThis.fetch = (input, init) =>
    String(input).startsWith(t.base + "/")
      ? nativeFetch(input, {
          ...init,
          headers: {
            ...active.headers,
            ...Object.fromEntries(new Headers(init?.headers)),
          },
        })
      : nativeFetch(input, init);
  const select = (a: typeof creator) => {
    active = a;
    setCSRF(a.headers["x-csrf-token"], a.user.id);
  };
  select(creator);
  let w = await api<{ state: AppState; revision: number }>("/workspace");
  const handle = "smoke-" + crypto.randomUUID().slice(0, 8);
  w.state.profile = {
    ...w.state.profile,
    name: "Fictional Smoke Creator",
    username: handle,
    identity: "AI Video Creator",
    skills: ["Editing", "Video", "Storytelling"].map((name) => ({
      id: name,
      name,
      category: "Design",
    })),
    creative: creativeSchema.parse({
      tools: ["Blender"],
      contentTypes: ["Video"],
      platforms: ["Instagram"],
      formats: ["Reel"],
      commercialUse: "Available",
    }),
  };
  w.state.projects = [
    {
      ...blankProject(),
      title: "Fictional product video study",
      description: "A self-directed test project using Blender.",
      techStack: ["Blender"],
      status: "Published",
    },
  ];
  w.state.portfolio.visibility = "Public";
  w.state.publication = publishPortfolio(
    w.state.portfolio,
    w.state.profile,
    w.state.projects,
  );
  w = await api("/workspace", {
    method: "PUT",
    body: { state: w.state, revision: w.revision },
  });
  assert.equal(
    (
      await api<{ total: number }>(
        "/creators/search?q=" + handle + "&tool=Blender",
      )
    ).total,
    1,
  );
  const analysis = await api<HecxResult>("/hecx/analyze", {
    method: "POST",
    body: { module: "Profile Analysis" },
  });
  assert.equal(analysis.provider, "Gemini · Evidence-grounded analysis");
  select(brand);
  const campaign = {
    ...blankCampaign(brand.user.id),
    title: "Fictional launch",
    brief: "A cinematic AI product launch video for Instagram.",
    contentType: "Video",
    tools: ["Blender"],
    platforms: ["Instagram"],
    format: "Reel",
  };
  campaignId = campaign.id;
  const market = await api<MarketplaceState>("/campaigns", {
    method: "POST",
    body: campaign,
  });
  assert.ok(market.campaigns.some((c) => c.id === campaign.id));
  const brief = await api<{
    draft: { platform: string };
    requiresReview: boolean;
  }>("/hecx/brief", { method: "POST", body: { prompt: campaign.brief } });
  assert.equal(brief.requiresReview, true);
  const explanation = await api<{
    match: { score: number | null };
    analysis: HecxResult;
  }>("/hecx/match-explanation", {
    method: "POST",
    body: { campaignId, creatorId: creator.user.id },
  });
  assert.equal(
    explanation.analysis.provider,
    "Gemini · Evidence-grounded analysis",
  );
  assert.equal(
    (await campaigns.findOne({ _id: campaignId }))?.data.brief,
    campaign.brief,
  );
  select(creator);
  testEmail.clear();
  await api("/auth/forgot-password", {
    method: "POST",
    body: { email: creator.user.email },
  });
  const otp = testEmail.messages.at(-1)?.text.match(/\b\d{6}\b/)?.[0];
  assert.ok(otp);
  const verified = await api<{ resetToken: string }>("/auth/verify-reset-otp", {
    method: "POST",
    body: { email: creator.user.email, otp },
  });
  await api("/auth/reset-password", {
    method: "POST",
    body: {
      resetToken: verified.resetToken,
      password: "Smoke-new-password-1234!",
    },
  });
  const login = await api<{ csrfToken: string }>("/auth/login", {
    method: "POST",
    body: { email: creator.user.email, password: "Smoke-new-password-1234!" },
  });
  assert.ok(login.csrfToken);
  console.log(
    JSON.stringify({
      status: "OK",
      realGemini: true,
      frontendTransport: true,
      persistedCreator: true,
      discovery: true,
      persistedCampaign: true,
      briefReview: true,
      matchExplanation: true,
      otpReset: true,
      privateUserDataSent: false,
      browserInteractionTested: false,
    }),
  );
} catch {
  console.error(
    "Full-stack smoke failed; no provider payloads or secrets logged.",
  );
  process.exitCode = 1;
} finally {
  globalThis.fetch = nativeFetch;
  setCSRF("");
  if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = previous;
  testEmail.clear();
  for (const id of ids) {
    await users.deleteOne({ _id: id });
    await sessions.deleteMany({ userId: id });
    await creatorDocuments.deleteOne({ _id: id });
    await brands.deleteOne({ _id: id });
    await preferences.deleteOne({ _id: id });
    await activity.deleteMany({ brandId: id });
    await memories.deleteMany({ userId: id });
    await passwordResets.deleteMany({ userId: id });
  }
  if (campaignId) await campaigns.deleteOne({ _id: campaignId });
  await t.close();
}
