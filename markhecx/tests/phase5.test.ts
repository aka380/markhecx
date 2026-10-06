import test from "node:test";
import assert from "node:assert/strict";
import {
  Actor,
  Application,
  blankCampaign,
  marketplaceSchema,
  Invitation,
} from "../lib/mark/marketplace/models";
import { initialMarketplace } from "../lib/mark/marketplace/fixtures";
import {
  brandService,
  campaignService,
  campaignErrors,
  applicationService,
  invitationService,
  analyticsService,
  messageService,
  readableCampaign,
  localMarketplaceProvider,
  savedCreatorService,
  toggleSaved,
} from "../lib/mark/marketplace/services";
import {
  matchingService,
  scoreCreator,
  ownerCreator,
} from "../lib/mark/marketplace/matching";
import {
  explainCampaignMatch,
  suggestCampaign,
  campaignHECXActions,
} from "../lib/mark/hecx/campaign";
import { creators } from "../lib/mark/data";
import { emptyState, migrateState } from "../lib/mark/store";
import { blankProject } from "../lib/mark/models";
const brand: Actor = { signedIn: true, role: "Brand", id: "local-brand" },
  creator: Actor = { signedIn: true, role: "Creator", id: "local" },
  guest: Actor = { ...creator, signedIn: false },
  other: Actor = { ...brand, id: "other-brand" };
function fixture() {
  let s = initialMarketplace();
  s = brandService.save(s, brand, {
    ...s.brands[0],
    name: "Test Brand",
    username: "testbrand",
  });
  const c = {
    ...blankCampaign(),
    id: "test-campaign",
    title: "Build a React tutorial",
    category: "Development",
    objective: "Education",
    description: "Explain an accessible React pattern.",
    brief: "Demonstrate a reusable React component.",
    requirements: {
      ...blankCampaign().requirements,
      requiredSkills: ["React", "TypeScript"],
      portfolioRequired: true,
    },
    deliverables: [
      {
        id: "d",
        type: "Tutorial",
        quantity: 1,
        description: "Explain one component.",
        deadline: "",
        requirements: "",
      },
    ],
  };
  s = campaignService.save(s, brand, c);
  return { s, c };
}
function published() {
  const { c, s: initial } = fixture();
  let s = initial;
  s = campaignService.status(s, brand, c.id, "Published");
  return { s, c: s.campaigns.find((x) => x.id === c.id)! };
}
function application(campaignId: string, id = "application"): Application {
  return {
    id,
    campaignId,
    creatorId: "local",
    message: "I can demonstrate an accessible component.",
    portfolio: "",
    projects: [],
    availability: "",
    terms: "",
    status: "Pending",
    submittedAt: "",
    updatedAt: "",
    demo: false,
  };
}
function invitation(campaignId: string): Invitation {
  return {
    id: "invitation",
    campaignId,
    creatorId: "local",
    message: "Would you like to discuss this tutorial?",
    note: "",
    status: "Pending",
    createdAt: "",
    demo: false,
  };
}
test("legacy state migrates to creator account without changing saved records", () => {
  const s = structuredClone(emptyState);
  s.saved = ["ava-chen"];
  const old = { ...s } as Record<string, unknown>;
  delete old.accountType;
  delete old.brandSaved;
  const next = migrateState(old);
  assert.equal(next.accountType, "Creator");
  assert.deepEqual(next.brandSaved, []);
  assert.deepEqual(next.saved, ["ava-chen"]);
});
test("campaign draft edit publish pause active complete archive lifecycle preserves data", () => {
  const { c, s: initial } = fixture();
  let s = initial;
  assert.equal(readableCampaign(s, guest, c.id), undefined);
  assert.equal(readableCampaign(s, creator, c.id), undefined);
  assert.equal(readableCampaign(s, brand, c.id)?.title, c.title);
  s = campaignService.save(s, brand, { ...c, title: "Revised brief" });
  for (const status of [
    "Published",
    "Active",
    "Paused",
    "Active",
    "Completed",
    "Archived",
    "Draft",
  ] as const)
    s = campaignService.status(s, brand, c.id, status);
  assert.equal(s.campaigns.find((x) => x.id === c.id)?.title, "Revised brief");
  assert.equal(readableCampaign(s, guest, c.id), undefined);
});
test("publishing requires brand and campaign essentials but not optional budgets or audience", () => {
  const { s, c } = fixture();
  assert.deepEqual(campaignErrors(c), []);
  assert.throws(
    () =>
      campaignService.status(
        { ...s, brands: initialMarketplace().brands },
        brand,
        c.id,
        "Published",
      ),
    /brand/,
  );
  assert.throws(
    () => campaignService.save(s, brand, { ...c, status: "Published" }),
    /status/,
  );
  assert.ok(campaignErrors({ ...c, brief: "", deliverables: [] }).length >= 2);
});
test("campaign dates, negative budgets and invalid deliverable quantities are rejected", () => {
  const { c } = fixture();
  for (const patch of [
    { startDate: "2026-02-30" },
    { startDate: "2026-10-10", endDate: "2026-10-01" },
    { applicationDeadline: "2026-11-01", endDate: "2026-10-01" },
    { budget: -1 },
    { deliverables: [{ ...c.deliverables[0], quantity: 0 }] },
  ])
    assert.ok(campaignErrors({ ...c, ...patch }).length);
});
test("campaign, brand, analytics mutations enforce roles and ownership", () => {
  const { s, c } = fixture();
  for (const actor of [guest, creator, other]) {
    assert.throws(() => campaignService.save(s, actor, c));
    assert.throws(() => campaignService.status(s, actor, c.id, "Published"));
    assert.throws(() => analyticsService.campaign(s, actor, c.id));
    assert.throws(() => brandService.save(s, actor, s.brands[0]));
  }
});
test("brand URLs and handles are validated", () => {
  const { s } = fixture();
  assert.throws(() =>
    brandService.save(s, brand, {
      ...s.brands[0],
      website: "javascript:alert(1)",
    }),
  );
  assert.throws(() =>
    brandService.save(s, brand, {
      ...s.brands[0],
      username: "openchapter-demo",
    }),
  );
  assert.throws(() =>
    brandService.save(s, brand, {
      ...s.brands[0],
      logo: "http://unsafe.test/logo.png",
    }),
  );
});
test("scoring is deterministic and percentage can be reconstructed from explicit weights", () => {
  const { c } = published();
  const result = matchingService.matchCreatorsToCampaign(c, creators);
  assert.deepEqual(
    result,
    matchingService.matchCreatorsToCampaign(c, creators),
  );
  for (const m of result) {
    const known = m.factors.filter((f) => f.value !== null);
    const total = known.reduce((s, f) => s + f.weight, 0);
    assert.equal(
      m.score,
      total
        ? Math.round(
            (known.reduce((s, f) => s + f.weight * f.value!, 0) / total) * 100,
          )
        : null,
    );
    assert.ok(m.score === null || (m.score >= 0 && m.score <= 100));
  }
  assert.ok(
    result.find((m) => m.creatorId === "marcus-reed")!.score! >
      result.find((m) => m.creatorId === "sana-patel")!.score!,
  );
});
test("unknown budget audience platform availability experience are not positive factors", () => {
  const { c } = fixture();
  const m = scoreCreator(
    {
      ...c,
      budget: 1000,
      targetAudience: "Developers",
      platforms: ["YouTube"],
      requirements: {
        ...c.requirements,
        availability: "Available",
        experienceLevel: "Advanced",
      },
    },
    creators[1],
  );
  for (const key of [
    "budget",
    "audience",
    "platform",
    "availability",
    "experience",
  ])
    assert.equal(m.factors.find((f) => f.key === key)?.value, null);
  assert.ok(m.coverage < 100);
});
test("no requirements or creator evidence yields no invented score", () => {
  const c = blankCampaign();
  assert.equal(scoreCreator(c, creators[0]).score, null);
  const sparse = {
    ...creators[0],
    skills: [],
    projects: [],
    identity: "",
    category: "",
    categories: [],
    publicPortfolio: false,
  };
  c.requirements.requiredSkills = ["Rust"];
  assert.equal(scoreCreator(c, sparse).score, null);
  assert.ok(
    explainCampaignMatch(scoreCreator(c, sparse)).explanation.includes(
      "not enough",
    ),
  );
});
test("HECX explanations use only recorded factor evidence", () => {
  const { c } = fixture();
  const scored = scoreCreator(c, creators[1]);
  const e = explainCampaignMatch(scored);
  for (const s of e.strengths)
    assert.ok(scored.factors.some((f) => s === `${f.label}: ${f.evidence}`));
  assert.ok(!e.explanation.includes("followers"));
  assert.ok(e.explanation.includes("not a prediction"));
});
test("campaign assistance is non-mutating and cannot invent budget audience or deliverables", () => {
  const { c } = fixture();
  const before = structuredClone(c);
  for (const action of campaignHECXActions) {
    const result = suggestCampaign(action, c);
    assert.equal(typeof result.text, "string");
    assert.deepEqual(c, before);
  }
  assert.equal(suggestCampaign("Suggest Creator Skills", c).applicable, false);
  assert.equal(
    suggestCampaign("Improve Campaign Brief", blankCampaign()).applicable,
    false,
  );
});
test("brand invite creator apply review message and analytics share the same records", () => {
  const { c, s: initial } = published();
  let s = initial;
  s = invitationService.send(s, brand, invitation(c.id), ["local"]);
  assert.equal(invitationService.list(s, creator).length, 1);
  s = invitationService.respond(s, creator, "invitation", "Accepted");
  s = applicationService.submit(s, creator, application(c.id));
  s = applicationService.review(s, brand, "application", "Shortlisted");
  s = applicationService.review(s, brand, "application", "Accepted");
  const target = { brandId: brand.id, creatorId: creator.id, campaignId: c.id };
  s = messageService.send(s, brand, target, "Let’s discuss the tutorial.", [
    "local",
  ]);
  s = messageService.send(s, creator, target, "I can share a plan.", []);
  assert.equal(messageService.list(s, brand)[0].messages.length, 2);
  assert.equal(messageService.list(s, creator)[0].messages.length, 2);
  assert.equal(applicationService.list(s, creator)[0].status, "Accepted");
  assert.deepEqual(analyticsService.campaign(s, brand, c.id), {
    applications: 1,
    invitations: 1,
    shortlisted: 0,
    accepted: 1,
    views: null,
  });
});
test("duplicate applications and invitations cannot inflate campaign analytics", () => {
  const { c, s: initial } = published();
  let s = initial;
  s = applicationService.submit(s, creator, application(c.id));
  assert.throws(
    () => applicationService.submit(s, creator, application(c.id, "other")),
    /already/,
  );
  s = invitationService.send(s, brand, invitation(c.id), ["local"]);
  assert.throws(
    () =>
      invitationService.send(s, brand, { ...invitation(c.id), id: "other" }, [
        "local",
      ]),
    /already/,
  );
});
test("applications require content and closed or expired campaigns do not accept submissions", () => {
  const { c, s: initial } = published();
  let s = initial;
  assert.throws(() =>
    applicationService.submit(s, creator, {
      ...application(c.id),
      message: " ",
    }),
  );
  s = campaignService.status(s, brand, c.id, "Paused");
  assert.throws(() => applicationService.submit(s, creator, application(c.id)));
  s = campaignService.status(s, brand, c.id, "Active");
  s = campaignService.save(s, brand, {
    ...s.campaigns.find((x) => x.id === c.id)!,
    applicationDeadline: "2000-01-01",
  });
  assert.throws(() => applicationService.submit(s, creator, application(c.id)));
  assert.throws(() =>
    invitationService.send(s, brand, invitation(c.id), ["local"]),
  );
});
test("only owner can withdraw and resubmit; only campaign owner can shortlist accept reject", () => {
  const { c, s: initial } = published();
  let s = initial;
  s = applicationService.submit(s, creator, application(c.id));
  assert.throws(() =>
    applicationService.review(
      s,
      { ...creator, id: "other" },
      "application",
      "Withdrawn",
    ),
  );
  assert.throws(() =>
    applicationService.review(s, other, "application", "Accepted"),
  );
  assert.throws(() =>
    applicationService.review(s, guest, "application", "Withdrawn"),
  );
  s = applicationService.review(s, creator, "application", "Withdrawn");
  s = applicationService.submit(s, creator, application(c.id, "second"));
  s = applicationService.review(s, brand, "second", "Rejected");
  assert.equal(
    s.applications.find((a) => a.id === "second")?.status,
    "Rejected",
  );
  assert.throws(() =>
    applicationService.review(s, brand, "second", "Accepted"),
  );
});
test("invitations cannot be sent to unknown creators or answered by another creator", () => {
  const { c, s: initial } = published();
  let s = initial;
  assert.throws(() => invitationService.send(s, brand, invitation(c.id), []));
  s = invitationService.send(s, brand, invitation(c.id), ["local"]);
  assert.throws(() =>
    invitationService.respond(
      s,
      { ...creator, id: "other" },
      "invitation",
      "Accepted",
    ),
  );
  s = invitationService.respond(s, creator, "invitation", "Declined");
  assert.equal(s.invitations[0].status, "Declined");
});
test("guest private lists are empty and unrelated participants cannot read or send messages", () => {
  const { c, s: initial } = published();
  let s = initial;
  s = messageService.send(
    s,
    brand,
    { brandId: brand.id, creatorId: "local", campaignId: c.id },
    "Hello",
    ["local"],
  );
  assert.deepEqual(messageService.list(s, guest), []);
  assert.deepEqual(messageService.list(s, other), []);
  assert.deepEqual(applicationService.list(s, guest), []);
  assert.deepEqual(invitationService.list(s, guest), []);
  assert.throws(() =>
    messageService.send(
      s,
      other,
      { brandId: brand.id, creatorId: "local", campaignId: c.id },
      "Spoofed",
      ["local"],
    ),
  );
  assert.throws(() =>
    messageService.send(
      s,
      brand,
      { brandId: brand.id, creatorId: "unknown", campaignId: c.id },
      "Hello",
      [],
    ),
  );
});
test("saved campaigns toggle and saved creator grouping require the right account", () => {
  const { c, s: initial } = published();
  let s = initial;
  s = campaignService.saveForCreator(s, creator, c.id);
  assert.ok(s.savedCampaigns.includes(c.id));
  s = campaignService.saveForCreator(s, creator, c.id);
  assert.deepEqual(s.savedCampaigns, []);
  assert.throws(() => campaignService.saveForCreator(s, brand, c.id));
  assert.throws(() => campaignService.saveForCreator(s, guest, c.id));
  const saved = toggleSaved([], creators[0].id);
  s = savedCreatorService.organize(s, brand, creators[0].id, "Design", saved);
  assert.equal(s.savedGroups[creators[0].id], "Design");
  assert.throws(() =>
    savedCreatorService.organize(s, creator, creators[0].id, "Design", saved),
  );
});
test("own match projection excludes private drafts and application snapshot survives source changes", () => {
  const app = structuredClone(emptyState);
  app.profile.name = "Owner";
  app.profile.skills = [{ id: "s", name: "React", category: "Development" }];
  app.projects = [
    { ...blankProject(), title: "PRIVATE DRAFT", status: "Draft" },
    { ...blankProject(), title: "Published tutorial", status: "Published" },
  ];
  const projection = ownerCreator(app);
  assert.deepEqual(
    projection.projects.map((p) => p.name),
    ["Published tutorial"],
  );
  const { c, s: initial } = published();
  let s = initial;
  const snapshot = {
    id: "local",
    name: "Owner",
    username: "owner",
    identity: "Developer",
    skills: ["React"],
    category: "Development",
    categories: ["Development"],
    projects: [],
    publicPortfolio: false,
  };
  s = applicationService.submit(s, creator, {
    ...application(c.id),
    creatorSnapshot: snapshot,
  });
  app.profile.name = "Changed";
  assert.equal(s.applications[0].creatorSnapshot?.name, "Owner");
  assert.ok(!JSON.stringify(s.applications[0]).includes("PRIVATE DRAFT"));
});
test("marketplace storage round trips and invalid storage recovers controlled fixtures", () => {
  let raw = "";
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => raw,
      setItem: (_k: string, v: string) => {
        raw = v;
      },
    },
  });
  const { s } = published();
  localMarketplaceProvider.write(s);
  assert.deepEqual(localMarketplaceProvider.read(), marketplaceSchema.parse(s));
  raw = "broken";
  assert.equal(localMarketplaceProvider.read().campaigns.length, 3);
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

test("explicit demo import connects controlled applications to owned campaigns without duplicating", () => {
  const { s } = fixture();
  const next = campaignService.loadDemo(s, brand);
  const imported = next.campaigns.filter(
    (c) => c.brandId === brand.id && c.demo,
  );
  assert.equal(imported.length, 3);
  assert.equal(
    applicationService.list(next, brand).filter((a) => a.demo).length,
    2,
  );
  assert.equal(
    invitationService.list(next, brand).filter((i) => i.demo).length,
    1,
  );
  assert.throws(() => campaignService.loadDemo(next, brand), /already/);
  assert.throws(() => campaignService.loadDemo(s, creator));
  assert.throws(
    () => campaignService.loadDemo(initialMarketplace(), brand),
    /profile/,
  );
  const edited = campaignService.save(next, brand, {
    ...imported[0],
    brief: "Updated example brief",
  });
  assert.equal(
    edited.campaigns.find((c) => c.id === imported[0].id)?.brief,
    "Updated example brief",
  );
});

test("submitted campaign context stays immutable after a campaign becomes a private draft", () => {
  const { c, s: initial } = published();
  let s = applicationService.submit(initial, creator, application(c.id));
  s = invitationService.send(s, brand, invitation(c.id), ["local"]);
  s = messageService.send(
    s,
    brand,
    { brandId: brand.id, creatorId: creator.id, campaignId: c.id },
    "Original discussion",
    ["local"],
  );
  s = campaignService.status(s, brand, c.id, "Archived");
  s = campaignService.status(s, brand, c.id, "Draft");
  s = campaignService.save(s, brand, {
    ...s.campaigns.find((x) => x.id === c.id)!,
    title: "PRIVATE NEW BRIEF",
    brief: "PRIVATE DETAILS",
  });
  assert.equal(readableCampaign(s, creator, c.id), undefined);
  assert.equal(
    applicationService.list(s, creator)[0].campaignSnapshot?.title,
    c.title,
  );
  assert.equal(
    invitationService.list(s, creator)[0].campaignSnapshot?.brief,
    c.brief,
  );
  assert.equal(messageService.list(s, creator)[0].campaignTitle, c.title);
});

test("match filtering intersects supported evidence and sorting is deterministic", async () => {
  const { filterMatches } = await import("../lib/mark/marketplace/matching");
  const { c } = fixture();
  const matches = matchingService.matchCreatorsToCampaign(c, creators);
  const f = {
    minimum: 0,
    skill: "",
    identity: "All identities",
    category: "All categories",
    experience: "Any experience",
    availability: "Any availability",
    portfolio: false,
    sort: "Best match",
  };
  assert.deepEqual(
    filterMatches(matches, creators, {
      ...f,
      skill: "TypeScript",
      category: "Design",
    }),
    [],
  );
  const filtered = filterMatches(matches, creators, {
    ...f,
    skill: "React",
    portfolio: true,
    minimum: 50,
  });
  assert.ok(filtered.some((m) => m.creatorId === "marcus-reed"));
  for (const sort of [
    "Best match",
    "Highest skill match",
    "Recently joined",
    "Most evidence",
  ]) {
    const first = filterMatches(matches, creators, { ...f, sort });
    assert.deepEqual(
      first,
      filterMatches([...matches].reverse(), creators, { ...f, sort }),
    );
  }
});

test("project evidence matches complete skill terms rather than accidental substrings", () => {
  const c = blankCampaign();
  c.requirements.requiredSkills = ["R"];
  const person = {
    ...creators[1],
    projects: [{ name: "React tutorial", detail: "Create a component." }],
  };
  assert.equal(
    scoreCreator(c, person).factors.find((f) => f.key === "projects")?.value,
    0,
  );
  c.requirements.requiredSkills = ["C++"];
  person.projects = [{ name: "Compiler", detail: "A C++ experiment." }];
  assert.equal(
    scoreCreator(c, person).factors.find((f) => f.key === "projects")?.value,
    1,
  );
});
