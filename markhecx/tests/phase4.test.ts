import test from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "../lib/mark/store";
import { blankProject } from "../lib/mark/models";
import { buildHECXContext } from "../lib/mark/hecx/context";
import { analyzeLocal, MockHECXProvider } from "../lib/mark/hecx/mock-provider";
import { hecxModules, AIProvider, HecxError } from "../lib/mark/hecx/contracts";
import {
  createHECXService,
  hecxService,
  validateHECXResponse,
} from "../lib/mark/hecx/service";
import { applyHECXChange } from "../lib/mark/hecx/apply";
function fixture() {
  const s = structuredClone(emptyState);
  s.signedIn = true;
  s.profile = {
    ...s.profile,
    name: "Real Name",
    username: "realname",
    identity: "Builder",
    skills: [
      {
        id: "a",
        name: "Python",
        category: "AI & Data",
        proficiency: "Advanced",
      },
      {
        id: "b",
        name: "Machine learning",
        category: "AI & Data",
        proficiency: "Learning",
      },
      { id: "c", name: "React", category: "Development" },
    ],
    avatar: "data:image/png;base64,PRIVATE_MEDIA",
    tags: ["Open source"],
  };
  s.projects = [
    {
      ...blankProject(),
      title: "My experiment",
      problem: "Manual classification",
      solution: "A documented prototype",
      contribution: "I wrote the parser",
      techStack: ["Python"],
      status: "Published",
      media: [
        {
          id: "i",
          type: "image",
          url: "data:image/png;base64,PRIVATE_IMAGE",
          alt: "Screenshot",
        },
      ],
    },
  ];
  return s;
}
test("context denies all owner data to logged-out callers", () => {
  const s = fixture();
  s.signedIn = false;
  const c = buildHECXContext(s, {
    module: "AI Chat",
    goal: "PRIVATE_GOAL",
    history: [{ role: "user", text: "PRIVATE_CHAT", module: "AI Chat" }],
  });
  assert.equal(c.profile, null);
  assert.deepEqual(c.projects, []);
  assert.deepEqual(c.history, []);
  assert.equal(c.goal, "");
  assert.ok(!JSON.stringify(c).includes("Real Name"));
  assert.equal(c.sourceVersion, "guest");
});
test("context excludes media bytes, location, saved lists, and activity", () => {
  const s = fixture();
  s.profile.location = "PRIVATE_LOCATION";
  s.activity = [{ id: "1", text: "PRIVATE_ACTIVITY", time: "" }];
  const c = buildHECXContext(s, { module: "Project Analysis" });
  const raw = JSON.stringify(c);
  for (const value of [
    "PRIVATE_IMAGE",
    "PRIVATE_MEDIA",
    "PRIVATE_LOCATION",
    "PRIVATE_ACTIVITY",
  ])
    assert.ok(!raw.includes(value));
  assert.equal(c.projects[0].mediaCount, 1);
});
test("context excludes nonpublic creator snapshots and selects only requested owner project", () => {
  const s = fixture();
  s.publication = {
    profile: s.profile,
    projects: s.projects,
    portfolio: { ...s.portfolio, visibility: "Private" },
    publishedAt: "",
  };
  assert.equal(
    buildHECXContext(s, { module: "Match Analyzer", creatorId: "local" })
      .publicCreator,
    null,
  );
  assert.equal(
    buildHECXContext(s, { module: "Project Analysis", projectId: "missing" })
      .projects.length,
    0,
  );
});
test("all ten modules return valid structured results for sparse and populated data", async () => {
  for (const s of [
    fixture(),
    { ...structuredClone(emptyState), signedIn: true },
  ])
    for (const mode of hecxModules) {
      const r = await hecxService.analyze(s, { module: mode });
      assert.ok(r.summary);
      assert.ok(r.provider.includes("Local"));
      assert.ok(Array.isArray(r.gaps));
    }
});
test("profile analysis reports required and optional fields without random percentages", async () => {
  const r = await hecxService.analyze(fixture(), {
    module: "Profile Analysis",
  });
  assert.ok(r.facts.includes("4 of 4 required profile areas supplied."));
  assert.ok(r.gaps.includes("Education not provided; optional."));
  assert.ok(!JSON.stringify(r).includes("78%"));
  assert.equal(r.suggestedChanges[0].target, "profile.bio");
});
test("project descriptions are composed only from supplied project facts", async () => {
  const s = fixture(),
    r = await hecxService.analyze(s, { module: "Project Analysis" });
  const change = r.suggestedChanges[0];
  assert.equal(change.targetId, s.projects[0].id);
  assert.match(String(change.value), /Manual classification/);
  assert.match(String(change.value), /I wrote the parser/);
  assert.ok(!String(change.value).includes("revenue"));
});
test("skill recommendations never become current skills or silently mutate state", async () => {
  const s = fixture(),
    before = JSON.stringify(s),
    r = await hecxService.analyze(s, { module: "Skill Analysis" });
  assert.ok(
    r.recommendations.some((x) =>
      x.includes("Recommended next skill, not an existing skill: Pandas"),
    ),
  );
  assert.ok(!r.facts.some((x) => x.includes("Pandas")));
  assert.equal(r.suggestedChanges.length, 0);
  assert.equal(JSON.stringify(s), before);
  assert.ok(r.strengths[0].includes("self-reported"));
});
test("achievement analysis cannot award badges and identifies missing evidence", async () => {
  const s = fixture();
  s.profile.achievements = [{ id: "1", title: "Completed my project" }];
  const r = await hecxService.analyze(s, { module: "Achievement Analysis" });
  assert.ok(r.gaps.some((x) => x.includes("describe what you did")));
  assert.ok(r.recommendations[0].includes("not an earned or verified badge"));
  assert.equal(r.suggestedChanges.length, 0);
});
test("identity is only a suggestion until accepted", async () => {
  const s = fixture(),
    r = await hecxService.analyze(s, { module: "Creator Identity" });
  assert.equal(r.suggestedChanges[0].value, "AI Developer");
  assert.equal(s.profile.identity, "Builder");
  const next = applyHECXChange(s, r.suggestedChanges[0], "accept");
  assert.equal(next.profile.identity, "AI Developer");
  assert.equal(s.profile.identity, "Builder");
});
test("accept, edit, reject, and stale checks preserve control over changes", async () => {
  const s = fixture(),
    r = await hecxService.analyze(s, { module: "Profile Analysis" });
  const change = r.suggestedChanges[0];
  assert.equal(applyHECXChange(s, change, "reject"), s);
  const edited = applyHECXChange(s, change, "accept", "My own reviewed bio.");
  assert.equal(edited.profile.bio, "My own reviewed bio.");
  assert.equal(s.profile.bio, "");
  assert.throws(
    () => applyHECXChange(edited, change, "accept"),
    /source data changed/,
  );
  const signedout = { ...s, signedIn: false };
  assert.throws(() => applyHECXChange(signedout, change, "accept"), /Sign in/);
});
test("portfolio suggestions change presentation only and never republish", async () => {
  const s = fixture();
  s.publication = {
    profile: structuredClone(s.profile),
    projects: structuredClone(s.projects),
    portfolio: structuredClone(s.portfolio),
    publishedAt: "before",
  };
  const r = await hecxService.analyze(s, { module: "Portfolio Improvements" });
  for (const proposal of r.suggestedChanges) {
    const next = applyHECXChange(s, proposal, "accept");
    assert.deepEqual(next.profile, s.profile);
    assert.deepEqual(next.projects, s.projects);
    assert.deepEqual(next.publication, s.publication);
    assert.equal(next.portfolio.status, "Draft");
  }
});
test("edited section order and featured selections must refer to real complete records", async () => {
  const s = fixture(),
    r = await hecxService.analyze(s, { module: "Portfolio Improvements" });
  const order = r.suggestedChanges.find((c) => c.target === "portfolio.order")!;
  assert.throws(
    () => applyHECXChange(s, order, "accept", ["fake"]),
    /every existing/,
  );
  const featured = r.suggestedChanges.find(
    (c) => c.target === "portfolio.featured",
  )!;
  assert.throws(
    () => applyHECXChange(s, featured, "accept", ["fake"]),
    /published projects/,
  );
});
test("match analysis uses public creator evidence and treats absent factors as unknown", async () => {
  const r = await hecxService.analyze(fixture(), {
    module: "Match Analyzer",
    creatorId: "sana-patel",
    query: "Python",
  });
  assert.ok(r.strengths.some((x) => x.includes("Python")));
  assert.ok(r.gaps.some((x) => x.includes("insufficient comparable data")));
  assert.ok(!JSON.stringify(r).includes("87%"));
});
test("campaign requirements are explicit user context and missing requirements need input", async () => {
  const r = await hecxService.analyze(fixture(), {
    module: "Match Analyzer",
    campaign: { name: "My brief", requiredSkills: ["Python", "Rust"] },
  });
  assert.ok(r.strengths.some((x) => x.includes("Python")));
  assert.ok(r.gaps.some((x) => x.includes("Rust")));
  const empty = await hecxService.analyze(fixture(), {
    module: "Match Analyzer",
    campaign: { name: "Brief", requiredSkills: [] },
  });
  assert.ok(empty.requiresUserInput.length);
});
test("workload never infers deadlines or capacity from project count", async () => {
  const r = await hecxService.analyze(fixture(), {
    module: "Workload Analyzer",
  });
  assert.equal(r.confidence, "Insufficient data");
  assert.ok(r.requiresUserInput[0].includes("available hours"));
});
test("workload estimates identify supplied deadline overlap and reject invalid dates", async () => {
  const options = {
    module: "Workload Analyzer" as const,
    workload: {
      availableHours: 4,
      commitments: [
        { title: "A", deadline: "2026-10-10", hours: 3 },
        { title: "B", deadline: "2026-10-10", hours: 3 },
      ],
    },
  };
  const r = await hecxService.analyze(fixture(), options);
  assert.ok(r.gaps.some((x) => x.includes("by 2 hours")));
  assert.ok(r.gaps.some((x) => x.includes("Shared deadline")));
  options.workload.commitments[0].deadline = "2026-02-31";
  assert.equal(
    (await hecxService.analyze(fixture(), options)).confidence,
    "Insufficient data",
  );
});
test("contextual chat routes bio requests and follows recent analysis context", async () => {
  const s = fixture();
  assert.equal(
    (
      await hecxService.analyze(s, {
        module: "AI Chat",
        message: "Improve my bio.",
      })
    ).module,
    "Profile Analysis",
  );
  const r = await hecxService.analyze(s, {
    module: "AI Chat",
    message: "What next?",
    history: [
      { role: "assistant", text: "Project review", module: "Project Analysis" },
    ],
  });
  assert.equal(r.module, "Project Analysis");
  assert.equal(
    buildHECXContext(s, {
      module: "AI Chat",
      history: Array.from({ length: 20 }, () => ({
        role: "user" as const,
        text: "hello",
        module: "AI Chat" as const,
      })),
    }).history.length,
    12,
  );
});
test("malformed responses and unauthorized change targets are rejected", () => {
  const c = buildHECXContext(fixture(), { module: "Profile Analysis" });
  assert.throws(() => validateHECXResponse({ summary: "bad" }, c), HecxError);
  const r = analyzeLocal(c);
  r.suggestedChanges[0].before = "forged";
  assert.throws(() => validateHECXResponse(r, c), HecxError);
});
test("service handles timeout, provider failures, invalid output and rate limits", async () => {
  const base: AIProvider = {
    ...MockHECXProvider,
    analyze: async () => new Promise(() => {}),
  };
  await assert.rejects(
    createHECXService(base, 5).analyze(fixture(), {
      module: "Profile Analysis",
    }),
    (e: HecxError) => e.code === "timeout",
  );
  for (const [code, provider] of [
    [
      "unavailable",
      {
        ...base,
        analyze: async () => {
          throw Error("secret raw error");
        },
      },
    ],
    ["invalid", { ...base, analyze: async () => ({ foo: "bad" }) }],
    [
      "rate_limit",
      {
        ...base,
        analyze: async () => {
          throw new HecxError("rate_limit");
        },
      },
    ],
  ] as const)
    await assert.rejects(
      createHECXService(provider).analyze(fixture(), {
        module: "Profile Analysis",
      }),
      (e: HecxError) => e.code === code,
    );
});
test("cancelled requests do not yield a result and field suggestions are validated", async () => {
  const signal = new AbortController();
  signal.abort();
  await assert.rejects(
    hecxService.analyze(
      fixture(),
      { module: "Profile Analysis" },
      signal.signal,
    ),
    (e: HecxError) => e.code === "cancelled",
  );
  const bad = { ...MockHECXProvider, suggest: async () => ({ text: 12 }) };
  await assert.rejects(
    createHECXService(bad).suggest("Improve Bio", "text"),
    (e: HecxError) => e.code === "invalid",
  );
});

test("featured-project suggestions can explicitly clear the draft selection", () => {
  const s = fixture();
  s.portfolio.featuredProjects = [s.projects[0].id];
  const context = buildHECXContext(s, { module: "Portfolio Improvements" });
  const result = analyzeLocal(context);
  const change = {
    id: "clear-featured",
    target: "portfolio.featured" as const,
    label: "Clear featured projects",
    reason: "User reviewed the selection.",
    before: [...s.portfolio.featuredProjects],
    value: [],
    sourceVersion: context.sourceVersion,
  };
  result.suggestedChanges = [change];
  validateHECXResponse(result, context);
  const next = applyHECXChange(s, change, "accept", []);
  assert.deepEqual(next.portfolio.featuredProjects, []);
  assert.deepEqual(s.portfolio.featuredProjects, [s.projects[0].id]);
  assert.deepEqual(next.projects, s.projects);
  assert.equal(next.portfolio.status, "Draft");
});
