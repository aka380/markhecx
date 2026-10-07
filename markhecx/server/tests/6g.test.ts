import test from "node:test";
import assert from "node:assert/strict";
import { start, account } from "./helpers";
import { blankBrand } from "../../lib/mark/marketplace/fixtures";
import {
  blankCampaign,
  MarketplaceState,
} from "../../lib/mark/marketplace/models";
import {
  brandService,
  campaignService,
  invitationService,
  messageService,
} from "../../lib/mark/marketplace/services";
import { marketCommands, persistMarket } from "../../lib/mark/api/marketplace";
import { api, setCSRF } from "../../lib/mark/api/client";
import { publishPortfolio } from "../../lib/mark/domain";

test("6G frontend command adapter persists a real brand-to-creator collaboration", async () => {
  const t = await start();
  const nativeFetch = globalThis.fetch;
  const previousURL = process.env.NEXT_PUBLIC_API_URL;
  try {
    const brand = await account(t.base, "Brand"),
      creator = await account(t.base);
    const w = await (
      await nativeFetch(t.base + "/workspace", { headers: creator.headers })
    ).json();
    w.state.profile = {
      ...w.state.profile,
      name: "Integration Creator",
      username: `integration-${crypto.randomUUID().slice(0, 8)}`,
      identity: "Developer",
      skills: ["React", "TypeScript", "Node.js"].map((name) => ({
        id: name,
        name,
        category: "Development",
      })),
    };
    w.state.portfolio.visibility = "Public";
    w.state.publication = publishPortfolio(
      w.state.portfolio,
      w.state.profile,
      w.state.projects,
    );
    assert.equal(
      (
        await nativeFetch(t.base + "/workspace", {
          method: "PUT",
          headers: creator.headers,
          body: JSON.stringify({ state: w.state, revision: w.revision }),
        })
      ).status,
      200,
    );
    process.env.NEXT_PUBLIC_API_URL = t.base;
    // A real HTTP client with two cookie jars, no browser automation or mocked API responses.
    let active = brand;
    globalThis.fetch = (input, init) =>
      nativeFetch(typeof input === "string" && input.startsWith("/api/v1") ? t.base + input.slice("/api/v1".length) : input, {
        ...init,
        headers: {
          ...active.headers,
          ...Object.fromEntries(new Headers(init?.headers)),
        },
      });
    const select = (a: typeof brand) => {
      active = a;
      setCSRF(a.headers["x-csrf-token"]);
    };
    select(brand);
    const actor = { signedIn: true, role: "Brand" as const, id: brand.user.id };
    let state = await api<MarketplaceState>("/marketplace");
    state = await persistMarket(
      state,
      brandService.save(state, actor, {
        ...blankBrand,
        id: actor.id,
        name: "Integration Brand",
        username: `integration-${crypto.randomUUID().slice(0, 8)}`,
      }),
    );
    const c = {
      ...blankCampaign(actor.id),
      title: "Integration tutorial",
      category: "Development",
      objective: "Education",
      description: "Explain React",
      brief: "Teach a component",
      requirements: {
        ...blankCampaign().requirements,
        requiredSkills: ["React"],
      },
      deliverables: [
        {
          id: "tutorial",
          type: "Tutorial",
          description: "Explain a component",
          quantity: 1,
          deadline: "",
          requirements: "",
        },
      ],
    };
    const next = campaignService.status(
      campaignService.save(state, actor, c),
      actor,
      c.id,
      "Published",
    );
    assert.deepEqual(
      marketCommands(state, next).map((x) => x.type),
      ["campaign.save", "campaign.status"],
    );
    state = await persistMarket(state, next);
    assert.equal(
      state.campaigns.find((x) => x.id === c.id)?.status,
      "Published",
    );
    const matching = await api<{
      matches: Record<string, { creatorId: string; factors: unknown[] }[]>;
    }>("/hecx/matches");
    assert.ok(
      matching.matches[c.id].find((x) => x.creatorId === creator.user.id)
        ?.factors.length,
    );
    const invitation = {
      id: crypto.randomUUID(),
      campaignId: c.id,
      creatorId: creator.user.id,
      message: "Please join",
      note: "",
      status: "Pending" as const,
      createdAt: "",
      demo: false,
    };
    state = await persistMarket(
      state,
      invitationService.send(state, actor, invitation, [creator.user.id]),
    );
    state = await persistMarket(
      state,
      messageService.send(
        state,
        actor,
        { campaignId: c.id, brandId: actor.id, creatorId: creator.user.id },
        "Can you discuss this brief?",
        [creator.user.id],
      ),
    );
    const conversation = state.conversations.find(
      (x) => x.campaignId === c.id,
    )!;
    select(creator);
    let creatorState = await api<MarketplaceState>("/marketplace");
    const creatorActor = {
      signedIn: true,
      role: "Creator" as const,
      id: creator.user.id,
    };
    assert.ok(creatorState.invitations.some((x) => x.id === invitation.id));
    creatorState = await persistMarket(
      creatorState,
      invitationService.respond(
        creatorState,
        creatorActor,
        invitation.id,
        "Accepted",
      ),
    );
    assert.equal(
      creatorState.invitations.find((x) => x.id === invitation.id)?.status,
      "Accepted",
    );
    assert.equal(
      (
        await api<{ messages: { text: string }[] }>(
          `/conversations/${conversation.id}/messages`,
        )
      ).messages[0].text,
      "Can you discuss this brief?",
    );
    assert.ok(
      (await api<{ notifications: unknown[] }>("/notifications")).notifications
        .length >= 2,
    );
    assert.equal(
      (
        await api<{ publication: { profile: { username: string } } }>(
          `/public/portfolios/${w.state.profile.username}`,
        )
      ).publication.profile.username,
      w.state.profile.username,
    );
  } finally {
    globalThis.fetch = nativeFetch;
    setCSRF("");
    if (previousURL === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previousURL;
    await t.close();
  }
});
