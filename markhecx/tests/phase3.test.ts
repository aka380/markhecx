import test from "node:test";
import assert from "node:assert/strict";
import { creators, searchCreators } from "../lib/mark/data";
import { emptyState } from "../lib/mark/store";
import { Publication, blankPortfolio, blankProject } from "../lib/mark/models";
import {
  discoveryCreators,
  searchDiscoveryCreators,
  filterCreators,
  sortCreators,
  getRecommendations,
  getSearchSuggestions,
  readDiscoveryQuery,
  updateDiscoveryQuery,
  runDiscovery,
  emptyFilters,
  sampleProfile,
  sampleProjects,
  samplePortfolio,
  safeDiscoveryReturn,
} from "../lib/mark/discovery";
const q = (value: string) =>
  readDiscoveryQuery(new URLSearchParams(value), false);
function pub(
  visibility: "Public" | "Private" | "Unlisted" = "Public",
): Publication {
  return {
    profile: {
      ...structuredClone(emptyState.profile),
      name: "Actual Person",
      username: "actual",
      identity: "Maker",
      skills: [{ id: "1", name: "Rust", category: "Development" }],
      tags: ["Systems"],
    },
    projects: [
      {
        ...blankProject(),
        title: "Real build",
        description: "A compiler",
        techStack: ["Rust"],
        status: "Published",
      },
      { ...blankProject(), title: "Secret draft" },
    ],
    portfolio: { ...blankPortfolio(), visibility, username: "actual" },
    publishedAt: "2026-10-06",
  };
}
test("search covers identity, username, categories, skills, project descriptions and tags", () => {
  for (const query of [
    "Ava",
    "avachen",
    "Product Designer",
    "Figma",
    "Forma",
    "Design",
    "Minimalist",
  ])
    assert.ok(
      searchDiscoveryCreators(creators, query).some((c) => c.id === "ava-chen"),
      query,
    );
  assert.ok(
    searchDiscoveryCreators(creators, "Programming").some(
      (c) => c.id === "marcus-reed",
    ),
  );
  assert.ok(
    searchDiscoveryCreators(creators, "React TypeScript").some(
      (c) => c.id === "marcus-reed",
    ),
  );
  assert.ok(
    searchDiscoveryCreators(creators, "health monitor").some(
      (c) => c.id === "marcus-reed",
    ),
  );
  assert.deepEqual(
    searchCreators("Python"),
    searchDiscoveryCreators(creators, "Python"),
  );
  assert.equal(
    searchDiscoveryCreators(creators, "nonexistent query").length,
    0,
  );
});
test("only public snapshots enter discovery; drafts and unpublished owner edits stay out", () => {
  assert.equal(discoveryCreators(null).length, creators.length);
  for (const v of ["Private", "Unlisted"] as const)
    assert.equal(discoveryCreators(pub(v)).length, creators.length);
  const pool = discoveryCreators(pub());
  assert.equal(pool.length, creators.length + 1);
  assert.equal(searchDiscoveryCreators(pool, "Rust").at(-1)?.id, "local");
  assert.equal(searchDiscoveryCreators(pool, "Secret draft").length, 0);
  assert.equal(pool.at(-1)?.joinedAt, undefined);
});
test("multiple filters combine with AND and multi-skill matching requires every skill", () => {
  const f = {
    ...emptyFilters,
    category: "Programming",
    skills: ["React", "TypeScript"],
    projects: "Has Projects",
    portfolio: "Has Public Portfolio",
  };
  assert.deepEqual(
    filterCreators(creators, f).map((c) => c.id),
    ["marcus-reed"],
  );
  assert.equal(
    filterCreators(creators, { ...f, skills: ["React", "Unknown"] }).length,
    0,
  );
  assert.deepEqual(
    filterCreators(creators, {
      ...emptyFilters,
      projects: "No Projects",
      portfolio: "No Public Portfolio",
    }).map((c) => c.id),
    ["eli-park"],
  );
  assert.ok(
    filterCreators(creators, {
      ...emptyFilters,
      availability: "Available",
      identity: "Educator",
      experience: "Intermediate",
    }).some((c) => c.id === "maya-ortiz"),
  );
  assert.equal(
    filterCreators(creators, { ...emptyFilters, category: "Finance" }).length,
    0,
  );
});
test("query serialization preserves unrelated filters, sorting and multiple skills across refresh", () => {
  const params = new URLSearchParams(
    "category=Programming&skill=React&skill=TypeScript&sort=Most+Projects&view=All+Creators",
  );
  const changed = updateDiscoveryQuery(params, { q: "React" });
  const restored = q(changed);
  assert.equal(restored.category, "Programming");
  assert.deepEqual(restored.skills, ["React", "TypeScript"]);
  assert.equal(restored.sort, "Most Projects");
  assert.equal(
    q(updateDiscoveryQuery(new URLSearchParams(changed), { q: "" })).skills
      .length,
    2,
  );
  assert.equal(params.has("q"), false);
});
test("defaults respect signed-in state and legacy navigation links", () => {
  assert.equal(q("").view, "Featured");
  assert.equal(
    readDiscoveryQuery(new URLSearchParams(), true).view,
    "Recommended",
  );
  assert.equal(q("q=Python").view, "All Creators");
  assert.equal(q("view=Trending+Creators").view, "Trending");
  assert.equal(q("view=Saved+Creators").view, "Saved");
  assert.equal(
    readDiscoveryQuery(new URLSearchParams(), false, true).view,
    "Saved",
  );
  assert.equal(q("sort=Most+Viewed").sort, "Most Relevant");
});
test("signed-out results cannot expose saved state or recommendations", () => {
  const context = { profile: sampleProfile(creators[0]), projects: [] };
  for (const view of ["Saved", "Recommended"]) {
    const result = runDiscovery(
      creators,
      q("view=" + view),
      false,
      [creators[0].id],
      context,
    );
    assert.equal(result.results.length, 0);
    assert.equal(result.recommendations.length, 0);
  }
  const result = runDiscovery(
    creators,
    q("view=All+Creators"),
    false,
    [creators[0].id],
    context,
  );
  assert.equal(result.recommendations.length, 0);
});
test("saving and unsaving are reflected without exposing removed/private local publications", () => {
  const query = q("view=Saved");
  assert.equal(
    runDiscovery(creators, query, true, ["ava-chen"], null).results[0].id,
    "ava-chen",
  );
  assert.equal(runDiscovery(creators, query, true, [], null).results.length, 0);
  assert.equal(
    runDiscovery(
      discoveryCreators(pub("Private")),
      query,
      true,
      ["local"],
      null,
    ).results.length,
    0,
  );
});
test("recommendations cite exact available evidence and never produce percentage scores", () => {
  const profile = structuredClone(emptyState.profile);
  profile.skills = [{ id: "r", name: "React", category: "Development" }];
  profile.tags = ["Open source"];
  const context = { profile, projects: [] };
  const before = JSON.stringify(context);
  const recs = getRecommendations(context, creators);
  const marcus = recs.find((r) => r.creatorId === "marcus-reed")!;
  assert.match(marcus.reasons.join(" "), /React/);
  assert.match(marcus.reasons.join(" "), /Open source/);
  assert.ok(recs.every((r) => !r.reasons.join(" ").includes("%")));
  assert.equal(JSON.stringify(context), before);
  assert.equal(
    getRecommendations({ profile: emptyState.profile, projects: [] }, creators)
      .length,
    0,
  );
  assert.equal(getRecommendations(null, creators).length, 0);
});
test("project recommendations use published technologies and exclude the current creator", () => {
  const project = {
    ...blankProject(),
    techStack: ["Python"],
    status: "Published" as const,
  };
  const ctx = { profile: emptyState.profile, projects: [project] };
  assert.ok(
    getRecommendations(ctx, discoveryCreators(pub())).some((r) =>
      r.reasons.some((s) => s.includes("Python")),
    ),
  );
  assert.ok(
    getRecommendations(ctx, discoveryCreators(pub())).every(
      (r) => r.creatorId !== "local",
    ),
  );
  assert.equal(
    getRecommendations(
      { ...ctx, projects: [{ ...project, status: "Draft" }] },
      creators,
    ).length,
    0,
  );
});
test("sorting is stable, data-backed, nonmutating, and puts missing dates last", () => {
  const original = creators.map((c) => c.id);
  const sorted = sortCreators(creators, "Recently Joined");
  assert.equal(sorted[0].id, "eli-park");
  assert.equal(sorted.at(-1)?.joinedAt, undefined);
  assert.equal(
    sortCreators(creators, "Most Relevant", "React TypeScript")[0].id,
    "marcus-reed",
  );
  const projects = sortCreators(creators, "Most Projects");
  assert.equal(projects[0].projects.length, 3);
  assert.deepEqual(
    creators.map((c) => c.id),
    original,
  );
});
test("suggestions group real creators, skills, categories, projects and handle empty queries", () => {
  for (const [query, type] of [
    ["ava", "Creators"],
    ["React", "Skills"],
    ["Programming", "Categories"],
    ["Forma", "Projects"],
  ])
    assert.ok(
      getSearchSuggestions(creators, query).some((s) => s.type === type),
    );
  assert.equal(getSearchSuggestions(creators, "").length, 0);
  assert.equal(getSearchSuggestions(creators, "absent-term").length, 0);
});
test("featured, trending, new and recommendation collections obey their evidence", () => {
  assert.ok(
    runDiscovery(creators, q("view=Featured"), false, [], null).results.every(
      (c) => c.featured && c.projects.length && c.publicPortfolio !== false,
    ),
  );
  assert.ok(
    runDiscovery(creators, q("view=Trending"), false, [], null).results.every(
      (c) => c.trending,
    ),
  );
  assert.ok(
    runDiscovery(
      creators,
      q("view=New+Creators"),
      false,
      [],
      null,
    ).results.every((c) => c.joinedAt),
  );
  assert.equal(
    runDiscovery(creators, q("view=Recommended"), true, [], {
      profile: emptyState.profile,
      projects: [],
    }).results.length,
    0,
  );
});
test("sample profiles and portfolios adapt the same data without invented records", () => {
  for (const c of creators) {
    const p = sampleProfile(c);
    assert.equal(p.name, c.name);
    assert.deepEqual(
      p.skills.map((s) => s.name),
      c.skills,
    );
    assert.equal(p.experience.length, 0);
    assert.equal(p.achievements.length, 0);
    assert.equal(p.education.length, 0);
    assert.equal(sampleProjects(c).length, c.projects.length);
    assert.equal(samplePortfolio(c).username, c.username);
  }
  assert.equal(new Set(creators.map((c) => c.username)).size, creators.length);
});
test("discovery return paths cannot redirect outside discovery", () => {
  assert.equal(
    safeDiscoveryReturn("/creators?q=React&skill=React"),
    "/creators?q=React&skill=React",
  );
  for (const value of [
    "https://example.com",
    "//example.com",
    "/profile",
    "/creators/other",
    null,
  ])
    assert.equal(safeDiscoveryReturn(value), "/creators");
});


test("AI discovery filters apply equally to samples and published project capabilities", () => {
  const pool = creators.filter(c => c.source === "sample");
  const candidate = pool.find(c => c.creative?.tools.length)!;
  assert.ok(candidate);
  for (const [key, value] of [
    ["tool", candidate.creative!.tools[0]],
    ["specialization", candidate.creative!.specialization],
    ["contentType", candidate.creative!.contentTypes[0]],
    ["platform", candidate.creative!.platforms[0]],
    ["format", candidate.creative!.formats[0]],
  ]) {
    if (!value) continue;
    const filters = readDiscoveryQuery(new URLSearchParams({view:"All Creators", [key]: value}), false);
    assert.ok(runDiscovery(pool, filters, false, [], null).results.some(c => c.id === candidate.id), key);
    const impossible = readDiscoveryQuery(new URLSearchParams({view:"All Creators", [key]: "not-a-real-capability"}), false);
    assert.equal(runDiscovery(pool, impossible, false, [], null).results.length, 0, key);
  }
});
