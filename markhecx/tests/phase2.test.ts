import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  migrateState,
  localRepository,
  safeLink,
} from "../lib/mark/store";
import {
  blankPortfolio,
  blankProject,
  CreatorProfile,
} from "../lib/mark/models";
import {
  profileErrors,
  projectErrors,
  visibleSections,
  publishPortfolio,
  canViewPublication,
  moveSection,
  selectedProjects,
} from "../lib/mark/domain";
import { createSuggestion } from "../lib/mark/assistance";
function profile(): CreatorProfile {
  return {
    ...structuredClone(emptyState.profile),
    name: "Test Creator",
    username: "test-creator",
    identity: "Independent builder",
    skills: ["Python", "C++", "Writing"].map((name, i) => ({
      id: String(i),
      name,
      category: "Other",
    })),
  };
}
test("Phase 1 migration preserves real data and never invents records", () => {
  const old = {
    signedIn: true,
    profile: {
      name: "Existing Creator",
      username: "existing",
      identity: "Builder",
      bio: "My real bio",
      skills: "Python, C++",
      avatar: "",
    },
    saved: ["ava-chen"],
    sections: [
      {
        id: "old-about",
        type: "About",
        title: "My story",
        content: "Existing portfolio text",
      },
    ],
    published: null,
    publishedAt: null,
    activity: [],
  };
  const migrated = migrateState(old);
  assert.equal(migrated.profile.bio, old.profile.bio);
  assert.deepEqual(
    migrated.profile.skills.map((s) => s.name),
    ["Python", "C++"],
  );
  assert.deepEqual(migrated.profile.experience, []);
  assert.deepEqual(migrated.profile.education, []);
  assert.deepEqual(migrated.projects, []);
  assert.equal(
    migrated.portfolio.sections[0].content,
    "Existing portfolio text",
  );
  assert.equal(migrated.portfolio.sections[0].source, "custom");
  assert.equal(migrated.publication, null);
});
test("profile requires only name, username, identity, and 3–5 unique skills", () => {
  assert.deepEqual(profileErrors(profile()), {});
  assert.ok(profileErrors({ ...profile(), username: "avachen" }).username);
  assert.ok(profileErrors({ ...profile(), username: "a b" }).username);
  assert.ok(profileErrors({ ...profile(), skills: [] }).skills);
  assert.ok(
    profileErrors({
      ...profile(),
      skills: [...profile().skills, ...profile().skills],
    }).skills,
  );
  assert.ok(
    profileErrors({
      ...profile(),
      socialLinks: [
        { id: "github", kind: "GitHub", url: "https://example.com" },
      ],
    }).GitHub,
  );
  assert.deepEqual(profileErrors({ ...profile(), socialLinks: [] }), {});
});
test("project title is required and optional URLs are validated", () => {
  const project = blankProject();
  assert.equal(projectErrors(project).title, "Project title required.");
  assert.deepEqual(projectErrors({ ...project, title: "My project" }), {});
  assert.ok(
    projectErrors({
      ...project,
      title: "My project",
      github: "javascript:alert(1)",
    }).github,
  );
  assert.equal(safeLink("https://user:password@github.com/repo"), null);
});
test("portfolio renders only real data and excludes draft projects", () => {
  const p = profile(),
    portfolio = blankPortfolio();
  const project = { ...blankProject(), title: "Private draft" };
  assert.deepEqual(
    visibleSections(portfolio, p, [project]).map((s) => s.type),
    ["Hero", "Skills"],
  );
  const added = { ...project, status: "Published" as const };
  assert.deepEqual(
    visibleSections(portfolio, p, [added]).map((s) => s.type),
    ["Hero", "Skills", "Projects"],
  );
  assert.deepEqual(selectedProjects(portfolio, [project]), []);
});
test("presentation changes never mutate creator data or project ownership", () => {
  const p = profile(),
    initial = JSON.stringify(p),
    portfolio = blankPortfolio();
  const moved = moveSection(portfolio, "section-skills", -1);
  assert.equal(moved.sections[1].type, "Skills");
  assert.equal(portfolio.sections[1].type, "About");
  assert.equal(JSON.stringify(p), initial);
  assert.equal(moveSection(portfolio, "does-not-exist", 1), portfolio);
  const project = {
    ...blankProject(),
    title: "My work",
    status: "Published" as const,
  };
  const selected = { ...portfolio, featuredProjects: [project.id] };
  assert.equal(selectedProjects(selected, [project]).length, 1);
  assert.equal(project.ownerId, "local-creator");
});
test("publication is an immutable snapshot of profile, work, and presentation", () => {
  const p = profile(),
    portfolio = blankPortfolio();
  const work = {
    ...blankProject(),
    title: "My original project",
    status: "Published" as const,
  };
  const pub = publishPortfolio(portfolio, p, [work]);
  p.name = "Edited name";
  p.skills[0].name = "Edited skill";
  work.title = "Edited project";
  portfolio.sections[0].enabled = false;
  assert.equal(pub.profile.name, "Test Creator");
  assert.equal(pub.profile.skills[0].name, "Python");
  assert.equal(pub.projects[0].title, "My original project");
  assert.equal(pub.portfolio.sections[0].enabled, true);
  assert.equal(pub.portfolio.username, "test-creator");
});
test("public and unlisted routes allow signed-out viewing; private requires owner state", () => {
  for (const visibility of ["Public", "Unlisted", "Private"] as const) {
    const pub = publishPortfolio(
      { ...blankPortfolio(), visibility },
      profile(),
      [],
    );
    assert.equal(
      canViewPublication(pub, "test-creator", false),
      visibility !== "Private",
    );
    assert.equal(canViewPublication(pub, "test-creator", true), true);
    assert.equal(canViewPublication(pub, "other-creator", true), false);
  }
  assert.equal(canViewPublication(null, "test-creator", true), false);
});
test("empty optional sections do not block publishing; missing essentials do", () => {
  assert.doesNotThrow(() => publishPortfolio(blankPortfolio(), profile(), []));
  assert.throws(
    () => publishPortfolio(blankPortfolio(), emptyState.profile, []),
    /Name/,
  );
  assert.throws(
    () =>
      publishPortfolio({ ...blankPortfolio(), sections: [] }, profile(), []),
    /Enable at least one/,
  );
});
test("HECX suggestions do not invent facts or mutate their source", () => {
  const source = "  I make   small tools.  ";
  assert.equal(
    createSuggestion("Improve Bio", source).text,
    "I make small tools.",
  );
  assert.equal(source, "  I make   small tools.  ");
  for (const action of [
    "Suggest Skills",
    "Suggest Creator Identity",
    "Suggest Tags",
    "Improve Section",
  ] as const) {
    assert.equal(createSuggestion(action, "").applicable, false);
    assert.equal(createSuggestion(action, "Python, C++").text, "Python, C++");
  }
  assert.equal(
    createSuggestion("Analyze Profile", "Missing username").applicable,
    false,
  );
});
test("Phase 2 repository round-trips typed data and published visibility", () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  const state = {
    ...structuredClone(emptyState),
    profile: profile(),
    publication: publishPortfolio(
      { ...blankPortfolio(), visibility: "Unlisted" },
      profile(),
      [],
    ),
  };
  localRepository.write(state);
  assert.deepEqual(localRepository.read(), state);
});
