import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BrandDashboard,
  BrandProfile,
  CampaignDiscovery,
  CampaignDetail,
  CampaignMatches,
  ApplicationsPage,
  InvitationsPage,
  SavedCreatorsPage,
} from "../components/mark/marketplace/pages";
import { CampaignEditor } from "../components/mark/marketplace/campaign-editor";
import { MessagesPage } from "../components/mark/marketplace/messages";
import { MatchAnalysis } from "../components/mark/marketplace/shared";
import { emptyState } from "../lib/mark/store";
import { initialMarketplace } from "../lib/mark/marketplace/fixtures";
import { Actor, blankCampaign } from "../lib/mark/marketplace/models";
import {
  campaignService,
  brandService,
  applicationService,
} from "../lib/mark/marketplace/services";
import {
  ownerCreator,
  matchingService,
} from "../lib/mark/marketplace/matching";
import { creators } from "../lib/mark/data";
const globals = globalThis as unknown as {
  __app: unknown;
  __market: unknown;
  __resource?: (path: string) => unknown;
};
function setup(role: Actor["role"] = "Brand", signedIn = true) {
  const app = { ...structuredClone(emptyState), signedIn, accountType: role };
  app.profile.name = "Test Creator";
  const actor: Actor = {
    signedIn,
    role,
    id: role === "Brand" ? "local-brand" : "local",
  };
  const brand: Actor = { signedIn: true, role: "Brand", id: "local-brand" };
  let data = initialMarketplace();
  data = brandService.save(data, brand, {
    ...data.brands[0],
    name: "Test Brand",
    username: "testbrand",
  });
  let c = {
    ...blankCampaign(),
    id: "owned",
    title: "Owned campaign",
    category: "Development",
    objective: "Education",
    description: "Explain React",
    brief: "<script>unsafe()</script> Explain React clearly",
    requirements: {
      ...blankCampaign().requirements,
      requiredSkills: ["React"],
    },
    deliverables: [
      {
        id: "d",
        type: "Tutorial",
        quantity: 1,
        description: "Explain a pattern",
        deadline: "",
        requirements: "",
      },
    ],
  };
  data = campaignService.save(data, brand, c);
  data = campaignService.status(data, brand, c.id, "Published");
  c = data.campaigns.find((x) => x.id === c.id)!;
  const market = { data, actor, ready: true, change: () => true };
  globals.__app = {
    state: app,
    ready: true,
    openAuth() {},
    update() {},
    logout() {},
    toggleSave() {},
  };
  globals.__market = market;
  globals.__resource = (path) =>
    path?.startsWith("/creators")
      ? { creators: creators.map((c) => ({ ...c, source: "local" })) }
      : path?.startsWith("/hecx/matches")
        ? {
            matches: Object.fromEntries(
              data.campaigns.map((c) => [
                c.id,
                matchingService.matchCreatorsToCampaign(
                  c,
                  role === "Brand" ? creators : [ownerCreator(app)],
                ),
              ]),
            ),
          }
        : undefined;
  return { market, c, app };
}
test("brand pages render shared management controls and real zero analytics", () => {
  setup();
  for (const element of [
    <BrandDashboard key="test-1" />,
    <BrandDashboard key="test-2" analytics />,
    <BrandProfile key="test-3" />,
    <CampaignEditor key="test-4" />,
    <CampaignEditor key="test-5" id="owned" />,
    <SavedCreatorsPage key="test-6" />,
    <ApplicationsPage key="test-7" />,
    <InvitationsPage key="test-8" />,
    <MessagesPage key="test-9" />,
  ]) {
    const html = renderToStaticMarkup(element);
    assert.ok(html.length > 100);
    assert.ok(!html.includes("NaN"));
    assert.ok(!html.includes("undefined"));
  }
  const html = renderToStaticMarkup(<BrandDashboard key="test-10" />);
  assert.ok(html.includes("0 applications"));
  assert.ok(html.includes("not connected"));
  assert.ok(!html.includes("demo-web"));
});
test("public campaign and brand pages show available data but no private management actions", () => {
  setup("Creator", false);
  const html = renderToStaticMarkup(<CampaignDetail id="owned" />);
  assert.ok(html.includes("Budget not specified"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>unsafe"));
  assert.ok(!html.includes("Edit campaign"));
  assert.ok(!html.includes("Application funnel"));
  assert.ok(html.includes("Apply to campaign"));
  assert.ok(
    renderToStaticMarkup(
      <BrandProfile key="test-11" username="openchapter-demo" />,
    ).includes("ILLUSTRATIVE BRAND"),
  );
});
test("creator pages show match and application entry points with unknowns explained", () => {
  setup("Creator");
  const html = renderToStaticMarkup(<CampaignDetail id="owned" />);
  assert.ok(html.includes("Apply to campaign"));
  assert.ok(html.includes("Save campaign"));
  assert.ok(html.includes("Message brand"));
  assert.ok(html.includes("Evidence coverage"));
  assert.ok(
    renderToStaticMarkup(<CampaignDiscovery />).includes(
      "Find your next collaboration",
    ),
  );
  assert.ok(
    renderToStaticMarkup(<CampaignDiscovery saved />).includes(
      "No saved campaigns",
    ),
  );
});
test("guest and wrong-role route guards hide private form controls", () => {
  setup("Creator", false);
  for (const page of [
    <BrandDashboard key="test-12" />,
    <CampaignEditor key="test-13" />,
    <CampaignMatches key="test-14" id="owned" />,
    <ApplicationsPage key="test-15" />,
    <MessagesPage key="test-16" />,
  ])
    assert.ok(renderToStaticMarkup(page).includes("Sign in to continue"));
  setup("Creator");
  const html = renderToStaticMarkup(<CampaignEditor key="test-17" />);
  assert.ok(html.includes("Sign in with a Brand account"));
  assert.ok(!html.includes("Publish campaign"));
});
test("matching renders factors filters scores reasons and mobile sheet trigger", () => {
  const { c } = setup();
  const html = renderToStaticMarkup(
    <CampaignMatches key="test-18" id="owned" />,
  );
  for (const value of [
    "Why this creator?",
    "Minimum match",
    "Match sort",
    "Filter &amp; sort matches",
    "Evidence",
  ]) {
    assert.ok(html.toLowerCase().includes(value.toLowerCase()), value);
  }
  assert.ok(html.includes("/messages?creator=marcus-reed&amp;campaign=owned"));
  assert.ok(!html.includes("/hecx?module=Match"));
  const match = matchingService.matchCreatorsToCampaign(
    { ...c, budget: 100, targetAudience: "Developers", platforms: ["YouTube"] },
    [creators[1]],
  )[0];
  const analysis = renderToStaticMarkup(<MatchAnalysis match={match} />);
  assert.ok(analysis.includes("Not enough data"));
  assert.ok(analysis.includes("Creator rates are unavailable"));
  assert.ok(analysis.includes("Unknown factors are excluded"));
});
test("brand application review renders submitted snapshot without private creator drafts", () => {
  const { market } = setup();
  market.data = applicationService.submit(
    market.data,
    { signedIn: true, role: "Creator", id: "local" },
    {
      id: "a",
      campaignId: "owned",
      creatorId: "local",
      creatorSnapshot: {
        id: "local",
        name: "Submitted creator",
        username: "submitted",
        identity: "Developer",
        skills: ["React"],
        category: "Development",
        categories: ["Development"],
        projects: [],
        publicPortfolio: false,
      },
      message: "I would love to help.",
      portfolio: "",
      projects: [],
      availability: "",
      terms: "",
      status: "Pending",
      submittedAt: "",
      updatedAt: "",
      demo: false,
    },
  );
  const html = renderToStaticMarkup(<ApplicationsPage key="test-19" />);
  for (const value of [
    "Submitted creator",
    "Pending",
    "Shortlist",
    "Accept",
    "Reject",
    "Message creator",
  ])
    assert.ok(html.includes(value));
  assert.ok(!html.includes("Test Creator"));
});
