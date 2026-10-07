import {
  Actor,
  Application,
  applicationSchema,
  Campaign,
  campaignSchema,
  CampaignAnalytics,
  MarketplaceState,
  Brand,
  brandSchema,
  Invitation,
  Conversation,
  marketplaceSchema,
} from "./models";
import { initialMarketplace } from "./fixtures";
import { safeLink } from "../store";
const now = () => new Date().toISOString();
export const toggleSaved = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
export function requireRole(actor: Actor, role: Actor["role"]) {
  if (!actor.signedIn || actor.role !== role)
    throw Error(`Sign in as a ${role.toLowerCase()} to continue.`);
}
export function owns(actor: Actor, campaign: Campaign) {
  return (
    actor.signedIn && actor.role === "Brand" && actor.id === campaign.brandId
  );
}
export const isPublic = (c: Campaign) =>
  ["Published", "Active", "Paused", "Completed"].includes(c.status);
export function readableCampaign(
  s: MarketplaceState,
  actor: Actor,
  id: string,
) {
  const c = s.campaigns.find((c) => c.id === id);
  return c && (isPublic(c) || owns(actor, c)) ? c : undefined;
}
function owned(s: MarketplaceState, actor: Actor, id: string) {
  requireRole(actor, "Brand");
  const c = s.campaigns.find((c) => c.id === id);
  if (!c || !owns(actor, c))
    throw Error("This campaign is not in your brand workspace.");
  return c;
}
export function campaignErrors(c: Campaign, publish = true): string[] {
  const errors: string[] = [];
  if (!c.title.trim()) errors.push("Add a campaign name.");
  if (publish) {
    if (!c.category.trim()) errors.push("Choose a category.");
    if (!c.objective) errors.push("Choose an objective.");
    if (!c.description.trim() || !c.brief.trim())
      errors.push("Add a short description and campaign brief.");
    if (!c.deliverables.length) errors.push("Define at least one deliverable.");
    if (
      !c.requirements.requiredSkills.length &&
      !c.requirements.creatorIdentity &&
      !c.requirements.categories.length
    )
      errors.push(
        "Add a skill, identity, or category requirement for matching.",
      );
  }
  for (const [label, value] of [
    ["Start date", c.startDate],
    ["End date", c.endDate],
    ["Application deadline", c.applicationDeadline],
    ...c.deliverables.map((d) => ["Deliverable deadline", d.deadline]),
  ])
    if (
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      errors.push(`${label} is invalid.`);
  if (c.startDate && c.endDate && c.startDate > c.endDate)
    errors.push("End date must follow the start date.");
  if (c.applicationDeadline && c.endDate && c.applicationDeadline > c.endDate)
    errors.push("Application deadline must be on or before the end date.");
  if (c.budget !== null && (!Number.isFinite(c.budget) || c.budget < 0))
    errors.push("Budget must be a non-negative number.");
  for (const d of c.deliverables)
    if (
      !d.type.trim() ||
      !d.description.trim() ||
      !Number.isInteger(d.quantity) ||
      d.quantity < 1
    )
      errors.push(
        "Each deliverable needs a type, description and positive quantity.",
      );
  return [...new Set(errors)];
}
export function briefReadiness(c: Campaign) {
  const checks = [
    ["Campaign goal", !!(c.objective && c.brief.trim())],
    ["Content type", !!c.contentType?.trim()],
    ["Creative style", !!c.creativeDirection.trim()],
    ["Format", !!c.format?.trim()],
    ["Aspect ratio", !!c.aspectRatio?.trim()],
    ["Creator requirements", !!(c.requirements.requiredSkills.length || c.requirements.creatorIdentity || c.requirements.categories.length)],
    ["Required tools", !!c.tools?.length],
    ["Platforms", !!c.platforms.length],
    ["Deliverables", !!c.deliverables.length && c.deliverables.every((d) => d.type.trim() && d.description.trim())],
    ["Timeline", !!(c.startDate && c.endDate && c.applicationDeadline)],
    ["Budget", c.budget !== null],
    ["Commercial rights", !!c.commercialUse && c.commercialUse !== "Unspecified"],
  ] as const;
  const complete = checks.filter(([, ready]) => ready).length;
  return {
    score: Math.round((complete / checks.length) * 100),
    complete: checks.filter(([, ready]) => ready).map(([label]) => label),
    missing: checks.filter(([, ready]) => !ready).map(([label]) => label),
  };
}
function event(
  s: MarketplaceState,
  c: Campaign,
  text: string,
): MarketplaceState {
  return {
    ...s,
    activity: [
      { id: crypto.randomUUID(), brandId: c.brandId, text, time: now() },
      ...s.activity,
    ].slice(0, 100),
  };
}
export const brandService = {
  save(s: MarketplaceState, a: Actor, input: Brand) {
    requireRole(a, "Brand");
    const b = brandSchema.parse(input);
    if (b.id !== a.id || b.demo)
      throw Error("You can only edit your own brand.");
    if (!b.name.trim() || !/^[a-z0-9_-]{3,30}$/.test(b.username))
      throw Error("Add a brand name and a 3–30 character lowercase handle.");
    if (s.brands.some((x) => x.id !== b.id && x.username === b.username))
      throw Error("That brand handle is already in use.");
    if ([b.website, ...b.socialLinks].some((x) => x && !safeLink(x)))
      throw Error("Use valid HTTPS website and social URLs.");
    if (b.logo && !safeLink(b.logo)) throw Error("Use an HTTPS logo URL.");
    return { ...s, brands: s.brands.map((x) => (x.id === b.id ? b : x)) };
  },
};
export const campaignService = {
  loadDemo(s: MarketplaceState, a: Actor) {
    requireRole(a, "Brand");
    const brand = s.brands.find((b) => b.id === a.id);
    if (!brand?.name || !brand.username)
      throw Error("Complete your brand profile before loading demo campaigns.");
    const samples = initialMarketplace();
    const sourceIds = samples.campaigns
      .filter((c) => !s.campaigns.some((x) => x.id === `${a.id}-${c.id}`))
      .map((c) => c.id);
    if (!sourceIds.length)
      throw Error("The demo campaigns are already in your workspace.");
    const campaigns = samples.campaigns
      .filter((c) => sourceIds.includes(c.id))
      .map((c) => ({ ...c, id: `${a.id}-${c.id}`, brandId: a.id }));
    return {
      ...s,
      campaigns: [...campaigns, ...s.campaigns],
      applications: [
        ...samples.applications
          .filter((x) => sourceIds.includes(x.campaignId))
          .map((x) => ({
            ...x,
            id: `${a.id}-${x.id}`,
            campaignId: `${a.id}-${x.campaignId}`,
          })),
        ...s.applications,
      ],
      invitations: [
        ...samples.invitations
          .filter((x) => sourceIds.includes(x.campaignId))
          .map((x) => ({
            ...x,
            id: `${a.id}-${x.id}`,
            campaignId: `${a.id}-${x.campaignId}`,
          })),
        ...s.invitations,
      ],
    };
  },
  save(s: MarketplaceState, a: Actor, input: Campaign) {
    requireRole(a, "Brand");
    const c = campaignSchema.parse(input);
    const existing = s.campaigns.find((x) => x.id === c.id);
    if (c.brandId !== a.id || (existing && !owns(a, existing)))
      throw Error("You can only save your own campaigns.");
    if (existing && existing.status !== c.status)
      throw Error("Use the campaign status action to change status.");
    if (!existing && c.status !== "Draft")
      throw Error("Create a draft before publishing.");
    const errors = campaignErrors(c, c.status !== "Draft");
    if (errors.length) throw Error(errors.join(" "));
    const saved = { ...c, updatedAt: now() };
    return event(
      {
        ...s,
        campaigns: existing
          ? s.campaigns.map((x) => (x.id === c.id ? saved : x))
          : [saved, ...s.campaigns],
      },
      c,
      `Saved ${c.title}`,
    );
  },
  status(
    s: MarketplaceState,
    a: Actor,
    id: string,
    status: Campaign["status"],
  ) {
    const c = owned(s, a, id);
    const allowed: Record<Campaign["status"], Campaign["status"][]> = {
      Draft: ["Published", "Archived"],
      Published: ["Active", "Paused", "Completed", "Archived"],
      Active: ["Paused", "Completed", "Archived"],
      Paused: ["Active", "Archived"],
      Completed: ["Archived"],
      Archived: ["Draft"],
    };
    if (!allowed[c.status].includes(status))
      throw Error("That status transition is not available.");
    if (["Published", "Active"].includes(status)) {
      const errors = campaignErrors(c);
      const b = s.brands.find((b) => b.id === c.brandId);
      if (!b?.name || !b.username)
        errors.push("Complete your brand name and handle before publishing.");
      if (errors.length) throw Error(errors.join(" "));
    }
    return event(
      {
        ...s,
        campaigns: s.campaigns.map((x) =>
          x.id === id ? { ...x, status, updatedAt: now() } : x,
        ),
      },
      c,
      `${c.title}: ${status}`,
    );
  },
  saveForCreator(s: MarketplaceState, a: Actor, id: string) {
    requireRole(a, "Creator");
    if (!readableCampaign(s, a, id)) throw Error("Campaign unavailable.");
    return { ...s, savedCampaigns: toggleSaved(s.savedCampaigns, id) };
  },
};
export function accepting(c: Campaign) {
  return (
    ["Published", "Active"].includes(c.status) &&
    (!c.applicationDeadline || c.applicationDeadline >= now().slice(0, 10))
  );
}
export const applicationService = {
  submit(s: MarketplaceState, a: Actor, input: Application) {
    requireRole(a, "Creator");
    const app = applicationSchema.parse(input);
    const c = readableCampaign(s, a, app.campaignId);
    if (!c || !accepting(c))
      throw Error("This campaign is not accepting applications.");
    if (app.creatorId !== a.id || app.status !== "Pending" || app.demo)
      throw Error("Invalid application owner or status.");
    if (s.applications.some((x) => x.id === app.id))
      throw Error("Application identifier already exists.");
    if (app.creatorSnapshot && app.creatorSnapshot.id !== a.id)
      throw Error("Invalid submitted creator evidence.");
    if (!app.message.trim())
      throw Error("Add a message explaining your interest.");
    if (
      s.applications.some(
        (x) =>
          x.campaignId === c.id &&
          x.creatorId === a.id &&
          x.status !== "Withdrawn",
      )
    )
      throw Error("You already have an application for this campaign.");
    return event(
      {
        ...s,
        applications: [
          {
            ...app,
            campaignSnapshot: structuredClone(c),
            submittedAt: now(),
            updatedAt: now(),
          },
          ...s.applications,
        ],
      },
      c,
      `New application for ${c.title}`,
    );
  },
  review(
    s: MarketplaceState,
    a: Actor,
    id: string,
    status: Application["status"],
  ) {
    const app = s.applications.find((x) => x.id === id);
    if (!app) throw Error("Application unavailable.");
    const c = s.campaigns.find((c) => c.id === app.campaignId);
    if (!c) throw Error("Campaign unavailable.");
    if (status === "Withdrawn") {
      requireRole(a, "Creator");
      if (
        app.creatorId !== a.id ||
        !["Pending", "Shortlisted"].includes(app.status)
      )
        throw Error("This application cannot be withdrawn.");
    } else {
      owned(s, a, c.id);
      if (
        !["Pending", "Shortlisted"].includes(app.status) ||
        !["Shortlisted", "Accepted", "Rejected"].includes(status) ||
        status === app.status
      )
        throw Error("This application cannot change to that status.");
    }
    return event(
      {
        ...s,
        applications: s.applications.map((x) =>
          x.id === id ? { ...x, status, updatedAt: now() } : x,
        ),
      },
      c,
      `Application ${status.toLowerCase()} for ${c.title}`,
    );
  },
  list(s: MarketplaceState, a: Actor) {
    if (!a.signedIn) return [];
    return s.applications.filter((x) =>
      a.role === "Creator"
        ? x.creatorId === a.id
        : s.campaigns.some((c) => c.id === x.campaignId && owns(a, c)),
    );
  },
};
export const invitationService = {
  send(s: MarketplaceState, a: Actor, input: Invitation, creatorIds: string[]) {
    const c = owned(s, a, input.campaignId);
    if (!accepting(c))
      throw Error(
        "Publish or activate a campaign with an open deadline before inviting.",
      );
    if (!creatorIds.includes(input.creatorId))
      throw Error("This creator is no longer publicly available.");
    if (!input.message.trim() || input.message.length > 6000)
      throw Error("Add an invitation message within 6,000 characters.");
    if (
      s.invitations.some(
        (x) =>
          x.campaignId === c.id &&
          x.creatorId === input.creatorId &&
          ["Pending", "Accepted"].includes(x.status),
      )
    )
      throw Error("An invitation already exists for this creator.");
    return event(
      {
        ...s,
        invitations: [
          {
            ...input,
            campaignSnapshot: structuredClone(c),
            status: "Pending",
            demo: false,
            createdAt: now(),
          },
          ...s.invitations,
        ],
      },
      c,
      `Invitation saved for ${c.title}`,
    );
  },
  respond(
    s: MarketplaceState,
    a: Actor,
    id: string,
    status: Invitation["status"],
  ) {
    const i = s.invitations.find((x) => x.id === id);
    if (!i || i.status !== "Pending") throw Error("Invitation unavailable.");
    if (status === "Cancelled") owned(s, a, i.campaignId);
    else {
      requireRole(a, "Creator");
      if (i.creatorId !== a.id || !["Accepted", "Declined"].includes(status))
        throw Error("You cannot respond to this invitation.");
    }
    return {
      ...s,
      invitations: s.invitations.map((x) =>
        x.id === id ? { ...x, status } : x,
      ),
    };
  },
  list(s: MarketplaceState, a: Actor) {
    return a.signedIn
      ? s.invitations.filter((i) =>
          a.role === "Creator"
            ? i.creatorId === a.id
            : s.campaigns.some((c) => c.id === i.campaignId && owns(a, c)),
        )
      : [];
  },
};
export const analyticsService = {
  campaign(s: MarketplaceState, a: Actor, id: string): CampaignAnalytics {
    owned(s, a, id);
    const apps = s.applications.filter((x) => x.campaignId === id);
    return {
      applications: apps.length,
      invitations: s.invitations.filter((x) => x.campaignId === id).length,
      shortlisted: apps.filter((x) => x.status === "Shortlisted").length,
      accepted: apps.filter((x) => x.status === "Accepted").length,
      views: null,
    };
  },
};
export const savedCreatorService = {
  organize(
    s: MarketplaceState,
    a: Actor,
    id: string,
    group: string,
    saved: string[],
  ) {
    requireRole(a, "Brand");
    if (!saved.includes(id)) throw Error("Save this creator first.");
    return {
      ...s,
      savedGroups: { ...s.savedGroups, [id]: group.trim().slice(0, 80) },
    };
  },
};
export const messageService = {
  list(s: MarketplaceState, a: Actor) {
    return a.signedIn
      ? s.conversations.filter((c) =>
          a.role === "Brand" ? c.brandId === a.id : c.creatorId === a.id,
        )
      : [];
  },
  send(
    s: MarketplaceState,
    a: Actor,
    target: Pick<Conversation, "brandId" | "creatorId" | "campaignId">,
    text: string,
    knownCreatorIds: string[],
  ) {
    if (
      !a.signedIn ||
      (a.role === "Brand" ? target.brandId !== a.id : target.creatorId !== a.id)
    )
      throw Error("This conversation is not yours.");
    if (a.role === "Brand" && !knownCreatorIds.includes(target.creatorId))
      throw Error("Choose an available creator or applicant.");
    const c = readableCampaign(s, a, target.campaignId);
    if (!c || c.brandId !== target.brandId)
      throw Error("Choose an available campaign for this conversation.");
    if (!text.trim() || text.length > 6000)
      throw Error("Enter a message within 6,000 characters.");
    const existing = s.conversations.find(
      (x) =>
        x.brandId === target.brandId &&
        x.creatorId === target.creatorId &&
        x.campaignId === target.campaignId,
    );
    if (existing && existing.messages.length >= 200)
      throw Error("This local conversation has reached its 200-message limit.");
    const conversation = {
      campaignTitle: existing?.campaignTitle || c.title,
      ...(existing || { ...target, id: crypto.randomUUID(), messages: [] }),
      messages: [
        ...(existing?.messages || []),
        {
          id: crypto.randomUUID(),
          sender: a.role,
          text: text.trim(),
          sentAt: now(),
        },
      ],
    };
    return {
      ...s,
      conversations: existing
        ? s.conversations.map((x) => (x.id === existing.id ? conversation : x))
        : [conversation, ...s.conversations],
    };
  },
};
export interface MarketplaceDataProvider {
  read(): MarketplaceState;
  write(state: MarketplaceState): void;
}
export const localMarketplaceProvider: MarketplaceDataProvider = {
  read() {
    try {
      const raw = localStorage.getItem("markhecx.marketplace.v1");
      return raw
        ? marketplaceSchema.parse(JSON.parse(raw))
        : initialMarketplace();
    } catch {
      return initialMarketplace();
    }
  },
  write(s) {
    localStorage.setItem(
      "markhecx.marketplace.v1",
      JSON.stringify(marketplaceSchema.parse(s)),
    );
  },
};
