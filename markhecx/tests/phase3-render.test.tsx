import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { CreatorProfileContent } from "../components/mark/profile";
import { PortfolioCanvas } from "../components/mark/phase2/portfolio-canvas";
import { CreatorCard } from "../components/mark/creator-card";
import { AppProvider } from "../components/mark/provider";
import { creators } from "../lib/mark/data";
import {
  sampleProfile,
  sampleProjects,
  samplePortfolio,
} from "../lib/mark/discovery";
import { emptyState } from "../lib/mark/store";

test("shared Phase 2 public profile hides owner controls and absent optional records", () => {
  const c = creators[0];
  const html = renderToStaticMarkup(
    <CreatorProfileContent
      profile={sampleProfile(c)}
      projects={sampleProjects(c)}
    />,
  );
  for (const text of [
    c.name,
    c.identity,
    ...c.skills,
    ...c.projects.map((p) => p.name),
  ])
    assert.ok(html.includes(text), text);
  for (const text of [
    "Edit profile",
    "Complete identity",
    "Add Project",
    "Analyze with HECX",
    "Experience",
    "Education",
    "Achievements",
  ])
    assert.ok(!html.includes(text), text);
  assert.ok(html.includes("View Project"));
});
test("owner profile retains editing, completion and project creation", () => {
  const html = renderToStaticMarkup(
    <CreatorProfileContent profile={emptyState.profile} projects={[]} owner />,
  );
  for (const text of [
    "Edit profile",
    "Complete identity",
    "Add Project",
    "No projects yet",
    "Analyze with HECX",
  ])
    assert.ok(html.includes(text), text);
});
test("all portfolio templates render the same source facts, omit absent records, and escape content", () => {
  const c = creators[0];
  const profile = sampleProfile(c);
  profile.bio = "<script>not executable</script>";
  for (const template of [
    "Minimal",
    "Creator",
    "Developer",
    "AI",
    "Editorial",
  ] as const) {
    const html = renderToStaticMarkup(
      <PortfolioCanvas
        profile={profile}
        projects={sampleProjects(c)}
        portfolio={{ ...samplePortfolio(c), template }}
      />,
    );
    assert.ok(html.includes("template-" + template.toLowerCase()));
    assert.ok(html.includes("Forma"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("section-experience"));
  }
});
test("creator cards use canonical profile/portfolio links and expose no signed-out recommendation", () => {
  const c = { ...creators[0], source: "local" as const };
  const html = renderToStaticMarkup(
    <AppProvider>
      <CreatorCard
        creator={c}
        returnTo="/creators?q=Figma"
        recommendation={{
          creatorId: c.id,
          weight: 3,
          reasons: ["Shared skills: Figma."],
        }}
      />
    </AppProvider>,
  );
  assert.ok(html.includes("/profile/avachen?from="));
  assert.ok(html.includes("/u/avachen?from="));
  assert.ok(html.includes("Save Ava Chen"));
  assert.ok(!html.includes("Recommended by HECX"));
  assert.ok(html.includes("Message Ava Chen"));
  assert.ok(html.includes("Invite Ava Chen"));
  const without = renderToStaticMarkup(
    <AppProvider>
      <CreatorCard creator={creators.find((c) => c.id === "eli-park")!} />
    </AppProvider>,
  );
  assert.ok(!without.includes("View Portfolio"));
  assert.ok(without.includes("No public portfolio"));
  assert.ok(without.includes("sample=1"));
  assert.ok(without.includes("Sample showcase"));
});

import { HecxInsights } from "../components/mark/hecx/insights";
import { analyzeLocal } from "../lib/mark/hecx/mock-provider";
import { buildHECXContext } from "../lib/mark/hecx/context";
test("HECX insights disclose provenance and render missing-data guidance without invented scores", () => {
  const state = { ...structuredClone(emptyState), signedIn: true };
  const result = analyzeLocal(
    buildHECXContext(state, { module: "Project Analysis" }),
  );
  const html = renderToStaticMarkup(
    <AppProvider>
      <HecxInsights result={result} />
    </AppProvider>,
  );
  assert.ok(html.includes("HECX needs more information"));
  assert.ok(html.includes("No external AI request"));
  assert.ok(html.includes("Add Project"));
  assert.ok(!html.includes("87%"));
});
test("HECX suggestions are labeled unapplied and escaped, with review disabled when signed out", () => {
  const state = { ...structuredClone(emptyState), signedIn: true };
  state.profile.identity = "<script>creator</script>";
  const result = analyzeLocal(
    buildHECXContext(state, { module: "Profile Analysis" }),
  );
  const html = renderToStaticMarkup(
    <AppProvider>
      <HecxInsights result={result} />
    </AppProvider>,
  );
  assert.ok(html.includes("AI suggestion · not applied"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("disabled"));
  assert.ok(!html.includes("<script>creator"));
});
