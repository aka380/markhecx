"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../provider";
import { useMatches } from "./use-matches";
import { useMarketplace } from "./provider";
import {
  Card,
  PageTitle,
  Badge,
  Button,
  Input,
  Textarea,
  Action,
  Choice,
  EmptyState,
  Avatar,
} from "../ui";
import {
  Access,
  Budget,
  CampaignCard,
  MatchAnalysis,
  ConfirmAction,
} from "./shared";
import {
  Campaign,
  Application,
  Brand,
  CreatorMatch,
} from "@/lib/mark/marketplace/models";
import {
  applicationService,
  brandService,
  campaignService,
  analyticsService,
  invitationService,
  owns,
  isPublic,
  readableCampaign,
  accepting,
  savedCreatorService,
} from "@/lib/mark/marketplace/services";
import {
  matchingService,
  ownerCreator,
  filterMatches,
} from "@/lib/mark/marketplace/matching";
import { useDiscoveryCreators } from "../discovery/use-discovery";
import { CreatorCard } from "../creator-card";
import { Creator } from "@/lib/mark/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { safeLink } from "@/lib/mark/store";
export function BrandDashboard({ analytics = false }: { analytics?: boolean }) {
  return (
    <Access role="Brand">
      <BrandDashboardContent analytics={analytics} />
    </Access>
  );
}
function BrandDashboardContent({ analytics }: { analytics: boolean }) {
  const { data, actor } = useMarketplace();
  const { state } = useApp();
  const campaigns = useMemo(
    () => data.campaigns.filter((c) => owns(actor, c)),
    [data.campaigns, actor],
  );
  const { matches: serverMatches } = useMatches();
  const matches = campaigns.map((c) => serverMatches[c.id] || []);
  const apps = applicationService.list(data, actor);
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="BRAND / WORKSPACE"
        title={
          analytics
            ? "Know what happened."
            : "Your next collaboration starts here."
        }
        description="Clear requirements, saved records, and explainable creator matches."
      >
        <Action href="/campaigns/new">Create campaign</Action>
        <Action href="/brand/profile" secondary>
          Brand profile
        </Action>
      </PageTitle>

      <div className="campaign-stats">
        {[
          [
            "Active campaigns",
            campaigns.filter((c) => c.status === "Active").length,
          ],
          [
            "Draft campaigns",
            campaigns.filter((c) => c.status === "Draft").length,
          ],
          ["Applications", apps.length],
          ["Saved creators", state.brandSaved.length],
          [
            "Creators with positive matches",
            new Set(
              matches
                .flat()
                .filter((m) => (m.score ?? 0) > 0)
                .map((m) => m.creatorId),
            ).size,
          ],
        ].map(([label, value]) => (
          <Card key={label} className="panel">
            <span className="small-note">{label}</span>
            <strong>{value}</strong>
          </Card>
        ))}
      </div>
      <div className="campaign-editor-grid">
        <section>
          <h2>Campaign performance</h2>
          {campaigns.length ? (
            <div className="campaign-grid">
              {campaigns.map((c) => (
                <Card key={c.id} className="panel">
                  <h3>{c.title}</h3>
                  <Badge>{c.status}</Badge>
                  {c.demo && <Badge>Demo campaign</Badge>}
                  <Analytics campaign={c} />
                  <Action href={`/campaigns/${c.id}`} secondary>
                    Manage campaign
                  </Action>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No campaigns yet"
              description="Create a brief to start finding creators. Analytics will reflect your actual campaign activity."
            >
              <Action href="/campaigns/new">Create campaign</Action>
            </EmptyState>
          )}
          <h2>Application funnel</h2>
          <p>
            {apps.filter((a) => a.status === "Pending").length} pending ·{" "}
            {apps.filter((a) => a.status === "Shortlisted").length} shortlisted
            · {apps.filter((a) => a.status === "Accepted").length} accepted ·{" "}
            {apps.filter((a) => a.status === "Rejected").length} rejected
          </p>
          <p className="small-note">
            Current record counts, not conversion rates or business outcomes.
            Views, reach, spend and engagement are unavailable.
          </p>
        </section>
        <section>
          <Card className="panel">
            <Badge tone="purple">HECX INSIGHTS</Badge>
            <h3>Evidence makes the difference.</h3>
            <p>
              {campaigns.length
                ? `${campaigns.filter((c) => !c.requirements.requiredSkills.length).length} campaigns have no required skills listed. Add explicit requirements to make comparisons more useful.`
                : "Define requirements first. HECX can compare them with listed creator skills, projects and portfolios."}
            </p>
            <Action href="/campaigns" secondary>
              View campaigns
            </Action>
          </Card>
          <Card className="panel section-copy">
            <h3>Recent activity</h3>
            {data.activity
              .filter((x) => x.brandId === actor.id)
              .slice(0, 8)
              .map((x) => (
                <p key={x.id}>
                  {x.text}{" "}
                  <small>{new Date(x.time).toLocaleDateString()}</small>
                </p>
              ))}
            {!data.activity.some((x) => x.brandId === actor.id) && (
              <p>No campaign activity yet.</p>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
export function Analytics({ campaign: c }: { campaign: Campaign }) {
  const { data, actor } = useMarketplace();
  if (!owns(actor, c)) return null;
  const a = analyticsService.campaign(data, actor, c.id);
  return (
    <div className="local-analytics">
      {c.demo && <Badge>Controlled demo records</Badge>}
      <p>
        {a.applications} applications · {a.invitations} invitations
      </p>
      <p>
        {a.shortlisted} shortlisted · {a.accepted} accepted
      </p>
      <p className="small-note">
        Views and external performance: not connected. Counts come from saved
        records.
      </p>
    </div>
  );
}
export function BrandProfile({ username }: { username?: string }) {
  const { data, actor } = useMarketplace();
  const brand = data.brands.find((b) =>
    username ? b.username === username : b.id === actor.id,
  );
  if (username)
    return brand ? (
      <PublicBrand brand={brand} />
    ) : (
      <EmptyState
        title="Brand not found"
        description="This brand has not published a profile."
      >
        <Action href="/campaigns">Browse campaigns</Action>
      </EmptyState>
    );
  return (
    <Access role="Brand">
      {brand && <BrandEditor key={brand.id} brand={brand} />}
    </Access>
  );
}
function PublicBrand({ brand: b }: { brand: Brand }) {
  const { data } = useMarketplace();
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow={b.demo ? "ILLUSTRATIVE BRAND" : "BRAND"}
        title={b.name || "Brand profile"}
        description={b.description}
      />
      <Avatar name={b.name} image={b.logo} large />
      <div className="tag-list">
        {[b.industry, b.location, b.companySize, ...b.categories]
          .filter(Boolean)
          .map((x) => (
            <Badge key={x}>{x}</Badge>
          ))}
      </div>
      <div className="row">
        {[b.website, ...b.socialLinks]
          .filter((x) => safeLink(x))
          .map((x) => (
            <a key={x} href={safeLink(x)!} rel="noreferrer" target="_blank">
              {new URL(x).hostname}
            </a>
          ))}
      </div>
      <h2>Campaigns</h2>
      <div className="campaign-grid">
        {data.campaigns
          .filter((c) => c.brandId === b.id && isPublic(c))
          .map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
      </div>
    </div>
  );
}
function BrandEditor({ brand }: { brand: Brand }) {
  const { actor, change } = useMarketplace();
  const [draft, setDraft] = useState(brand);
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="BRAND / PROFILE"
        title="Introduce your brand."
        description="Only information you provide appears on your brand page."
      />
      <Card className="panel">
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await change((s) => brandService.save(s, actor, draft)))
              toast.success("Brand profile saved.");
          }}
        >
          {(
            [
              ["name", "Brand name"],
              ["username", "Handle"],
              ["industry", "Industry"],
              ["description", "Description"],
              ["website", "Website (HTTPS)"],
              ["logo", "Logo URL (HTTPS)"],
              ["location", "Location (optional)"],
              ["companySize", "Company size (optional)"],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <Input
                value={draft[key]}
                maxLength={key === "description" ? 6000 : 200}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="field">
            Categories (comma separated)
            <Input
              defaultValue={draft.categories.join(", ")}
              onBlur={(e) =>
                setDraft((d) => ({
                  ...d,
                  categories: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
          </label>
          <label className="field">
            Social URLs (one per line)
            <Textarea
              defaultValue={draft.socialLinks.join("\n")}
              onBlur={(e) =>
                setDraft((d) => ({
                  ...d,
                  socialLinks: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
          </label>
          <div className="row">
            <Button className="btn-primary" type="submit">
              Save profile
            </Button>
            {brand.username && (
              <Action href={`/b/${brand.username}`} secondary>
                View brand page
              </Action>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
export function CampaignDiscovery({ saved = false }: { saved?: boolean }) {
  const { data, actor, ready } = useMarketplace();
  const [q, setQ] = useState(""),
    [category, setCategory] = useState("All categories"),
    [sort, setSort] = useState("Newest");
  const { matches: serverMatches } = useMatches();
  const matchMap = new Map(
    Object.entries(serverMatches).map(([id, matches]) => [id, matches[0]]),
  );
  const campaigns = data.campaigns
    .filter(
      (c) =>
        (isPublic(c) || owns(actor, c)) &&
        (!saved || data.savedCampaigns.includes(c.id)) &&
        (category === "All categories" || c.category === category) &&
        `${c.title} ${c.description} ${c.requirements.requiredSkills.join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Best match"
        ? (matchMap.get(b.id)?.score ?? -1) - (matchMap.get(a.id)?.score ?? -1)
        : b.createdAt.localeCompare(a.createdAt),
    );
  const content = (
    <div className="page-enter">
      <PageTitle
        eyebrow="CAMPAIGNS / OPPORTUNITIES"
        title={
          saved ? "Opportunities you saved." : "Find your next collaboration."
        }
        description="Browse public briefs. Understand the requirements before you apply."
      >
        {actor.signedIn && actor.role === "Brand" ? (
          <Action href="/campaigns/new">Create campaign</Action>
        ) : (
          <Action href="/campaigns/saved" secondary>
            Saved campaigns
          </Action>
        )}
      </PageTitle>
      <div className="campaign-filters">
        <label className="field">
          Search
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Campaign, skill, or brief"
          />
        </label>
        <Choice
          label="Campaign category"
          value={category}
          options={[
            "All categories",
            ...new Set(
              data.campaigns
                .filter((c) => isPublic(c) || owns(actor, c))
                .map((c) => c.category)
                .filter(Boolean),
            ),
          ]}
          onChange={setCategory}
        />
        <Choice
          label="Campaign sort"
          value={sort}
          options={
            actor.signedIn && actor.role === "Creator"
              ? ["Newest", "Best match"]
              : ["Newest"]
          }
          onChange={setSort}
        />
      </div>
      <div className="campaign-grid">
        {campaigns.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            match={
              actor.signedIn && actor.role === "Creator"
                ? matchMap.get(c.id)
                : undefined
            }
          />
        ))}
      </div>
      {!campaigns.length && ready && (
        <EmptyState
          title={saved ? "No saved campaigns" : "No campaigns found"}
          description={
            saved
              ? "Save a public campaign to return to it here."
              : "Try a different search or category. Brands can create a new campaign."
          }
        >
          <Action href="/campaigns">Browse campaigns</Action>
        </EmptyState>
      )}
    </div>
  );
  return saved ? <Access role="Creator">{content}</Access> : content;
}
export function CampaignDetail({ id }: { id: string }) {
  const { data, actor, change } = useMarketplace();
  const { openAuth } = useApp();
  const [tab, setTab] = useState("Overview"),
    [apply, setApply] = useState(false);
  const c = readableCampaign(data, actor, id);
  const matching = useMatches();
  const match = matching.matches[id]?.[0] || null;
  if (!c)
    return (
      <EmptyState
        title="Campaign unavailable"
        description="This campaign may be private, archived, or no longer available."
      >
        <Action href="/campaigns">Browse campaigns</Action>
      </EmptyState>
    );
  const owner = owns(actor, c),
    brand = data.brands.find((b) => b.id === c.brandId),
    application = data.applications.find(
      (a) =>
        a.campaignId === id &&
        a.creatorId === actor.id &&
        a.status !== "Withdrawn",
    );
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow={
          owner ? "BRAND / CAMPAIGN MANAGEMENT" : "CAMPAIGN / OPPORTUNITY"
        }
        title={c.title}
        description={c.description}
      >
        <Badge>{c.status}</Badge>
        {c.demo && <Badge>Demo campaign</Badge>}
        {brand?.username && (
          <Action href={`/b/${brand.username}`} secondary>
            {brand.name}
          </Action>
        )}
      </PageTitle>
      {owner ? (
        <>
          <div className="row">
            <Action href={`/campaigns/${id}/edit`}>Edit campaign</Action>
            <Action href={`/campaigns/${id}/matches`} secondary>
              ✦ Find creators
            </Action>
            {(
              {
                Draft: ["Published", "Archived"],
                Published: ["Active", "Paused", "Completed", "Archived"],
                Active: ["Paused", "Completed", "Archived"],
                Paused: ["Active", "Archived"],
                Completed: ["Archived"],
                Archived: ["Draft"],
              } as const
            )[c.status].map((status) => (
              <ConfirmAction
                key={status}
                label={status === "Published" ? "Publish" : `Mark ${status}`}
                description={`Change ${c.title} from ${c.status} to ${status}. Public visibility and application availability follow the campaign status.`}
                onConfirm={async () =>
                  await change((s) =>
                    campaignService.status(s, actor, id, status),
                  )
                }
              />
            ))}
          </div>
          <nav className="campaign-tabs" aria-label="Campaign management">
            {[
              "Overview",
              "Applications",
              "Invitations",
              "Shortlisted",
              "Messages",
              "Analytics",
            ].map((t) => (
              <Button
                key={t}
                variant={t === tab ? "secondary" : "ghost"}
                onClick={() => setTab(t)}
              >
                {t}
              </Button>
            ))}
          </nav>
        </>
      ) : (
        <div className="row">
          {(!actor.signedIn || actor.role !== "Brand") && (
            <>
              <Button
                className="btn-primary"
                disabled={!!application || !accepting(c)}
                onClick={() => (actor.signedIn ? setApply(true) : openAuth())}
              >
                {application
                  ? `Application: ${application.status}`
                  : accepting(c)
                    ? "Apply to campaign"
                    : "Applications closed"}
              </Button>
              <Button
                variant="outline"
                aria-pressed={
                  actor.signedIn && data.savedCampaigns.includes(id)
                }
                onClick={async () =>
                  actor.signedIn
                    ? await change((s) =>
                        campaignService.saveForCreator(s, actor, id),
                      )
                    : openAuth()
                }
              >
                {actor.signedIn && data.savedCampaigns.includes(id)
                  ? "Unsave campaign"
                  : "Save campaign"}
              </Button>
              {actor.signedIn && (
                <Action href={`/messages?campaign=${id}`} secondary>
                  Message brand
                </Action>
              )}
            </>
          )}
        </div>
      )}
      {(!owner || tab === "Overview") && (
        <div className="campaign-editor-grid">
          <Card className="panel">
            <h2>What the brand wants</h2>
            <p className="profile-bio">{c.brief}</p>
            {[
              ["Objective", c.objective],
              ["Problem", c.problem],
              ["Desired outcome", c.outcome],
              ["Target audience", c.targetAudience],
              ["Key message", c.keyMessage],
              ["Creative direction", c.creativeDirection],
              ["Restrictions", c.restrictions],
            ]
              .filter(([, v]) => v)
              .map(([l, v]) => (
                <div key={l}>
                  <h3>{l}</h3>
                  <p>{v}</p>
                </div>
              ))}
            <h2>What you need to deliver</h2>
            {c.deliverables.map((d) => (
              <div className="deliverable" key={d.id}>
                <h3>
                  {d.quantity} × {d.type}
                </h3>
                <p>{d.description}</p>
                {d.requirements && <p>{d.requirements}</p>}
                {d.deadline && <p>Due {d.deadline}</p>}
              </div>
            ))}
            <p>Platforms: {c.platforms.join(", ") || "Not specified"}</p>
          </Card>
          <section>
            <Card className="panel">
              <h2>Requirements</h2>
              <p>
                Required skills:{" "}
                {c.requirements.requiredSkills.join(", ") || "Not specified"}
              </p>
              <p>
                Preferred skills:{" "}
                {c.requirements.preferredSkills.join(", ") || "Not specified"}
              </p>
              {[
                c.requirements.creatorIdentity,
                ...c.requirements.categories,
                c.requirements.experienceLevel,
                c.requirements.availability,
                c.requirements.portfolioRequired
                  ? "Public portfolio required"
                  : "",
              ]
                .filter(Boolean)
                .map((x, i) => (
                  <p key={i}>{x}</p>
                ))}
              <Budget campaign={c} />
              <p>Start: {c.startDate || "Not specified"}</p>
              <p>End: {c.endDate || "Not specified"}</p>
              <p>Apply by: {c.applicationDeadline || "Not specified"}</p>
              {c.turnaround && <p>Turnaround: {c.turnaround}</p>}
            </Card>
            {actor.signedIn && actor.role === "Creator" && matching.error && (
              <Card className="panel section-copy">
                <p role="alert">{matching.error}</p>
                <Button onClick={matching.retry}>Retry matching</Button>
              </Card>
            )}
            {actor.signedIn && actor.role === "Creator" && matching.loading && (
              <p role="status">Analyzing your match…</p>
            )}
            {actor.signedIn && actor.role === "Creator" && match && (
              <Card className="panel section-copy">
                <MatchAnalysis match={match} />
              </Card>
            )}
            {!actor.signedIn && (
              <p>Sign in as a creator to see your HECX match.</p>
            )}
          </section>
        </div>
      )}
      {owner && ["Applications", "Shortlisted"].includes(tab) && (
        <ApplicationsContent
          campaignId={id}
          shortlisted={tab === "Shortlisted"}
        />
      )}{" "}
      {owner && tab === "Invitations" && <InvitationsContent campaignId={id} />}{" "}
      {owner && tab === "Analytics" && (
        <Card className="panel">
          <Analytics campaign={c} />
        </Card>
      )}{" "}
      {owner && tab === "Messages" && (
        <Action href={`/messages?campaign=${id}`}>
          Open campaign messages
        </Action>
      )}
      {apply && (
        <ApplicationForm campaign={c} onClose={() => setApply(false)} />
      )}
    </div>
  );
}
function ApplicationForm({
  campaign: c,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const { state } = useApp();
  const { actor, change } = useMarketplace();
  const [message, setMessage] = useState(""),
    [projects, setProjects] = useState<string[]>([]),
    [portfolio, setPortfolio] = useState(false),
    [availability, setAvailability] = useState(""),
    [terms, setTerms] = useState("");
  const published = state.projects.filter((p) => p.status === "Published"),
    publicPortfolio = state.publication?.portfolio.visibility === "Public";
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="mark-dialog campaign-dialog">
        <DialogTitle>Apply to {c.title}</DialogTitle>
        <DialogDescription>
          Your message and selected evidence are shared with the campaign’s
          brand.
        </DialogDescription>
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!state.profile.name.trim()) {
              toast.error(
                "Add your name in your creator profile before applying.",
              );
              return;
            }
            const creator = ownerCreator(state);
            const selected = published.filter((p) => projects.includes(p.id));
            const snapshot = {
              id: creator.id,
              name: creator.name,
              username: creator.username,
              identity: creator.identity,
              skills: creator.skills,
              category: creator.category,
              categories: creator.categories || [],
              projects: selected.map((p) => ({
                name: p.title,
                detail: [p.description, ...p.techStack].join(" "),
              })),
              publicPortfolio: portfolio && !!publicPortfolio,
            };
            if (
              await change((s) =>
                applicationService.submit(s, actor, {
                  id: crypto.randomUUID(),
                  campaignId: c.id,
                  creatorId: actor.id,
                  creatorSnapshot: snapshot,
                  message,
                  portfolio:
                    portfolio && publicPortfolio
                      ? `/u/${state.publication!.profile.username}`
                      : "",
                  projects: selected.map((p) => p.title),
                  availability,
                  terms,
                  status: "Pending",
                  submittedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  demo: false,
                }),
              )
            ) {
              toast.success("Application submitted.");
              onClose();
            }
          }}
        >
          <label className="field">
            Your message
            <Textarea
              required
              maxLength={6000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <p className="small-note">
            Your name, handle, identity, skills and categories are included as
            an application snapshot. Only the projects selected below are
            shared.
          </p>
          {publicPortfolio && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={portfolio}
                onChange={(e) => setPortfolio(e.target.checked)}
              />{" "}
              Include my public portfolio
            </label>
          )}
          <fieldset>
            <legend>Relevant published projects (optional)</legend>
            {published.length ? (
              published.map((p) => (
                <label className="check-label" key={p.id}>
                  <input
                    type="checkbox"
                    checked={projects.includes(p.id)}
                    onChange={() =>
                      setProjects(
                        projects.includes(p.id)
                          ? projects.filter((x) => x !== p.id)
                          : [...projects, p.id],
                      )
                    }
                  />
                  {p.title}
                </label>
              ))
            ) : (
              <p>No published projects yet. You can still apply.</p>
            )}
          </fieldset>
          <label className="field">
            Availability (optional)
            <Input
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            />
          </label>
          <label className="field">
            Proposed terms (optional)
            <Textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </label>
          <Button type="submit" className="btn-primary">
            Submit application
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function ApplicationsPage() {
  return (
    <Access>
      <PageTitle
        eyebrow="APPLICATIONS"
        title="Keep the next step clear."
        description="Track submissions and review creator evidence."
      />
      <ApplicationsContent />
    </Access>
  );
}
function applicationCreator(
  app: Application,
  pool: Creator[],
): Creator | undefined {
  if (app.creatorSnapshot)
    return {
      ...app.creatorSnapshot,
      bio: "",
      tags: [],
      badge: "",
      color: "violet",
      featured: false,
      trending: false,
      source: "local",
    };
  return pool.find((c) => c.id === app.creatorId);
}
export function ApplicationsContent({
  campaignId,
  shortlisted = false,
}: {
  campaignId?: string;
  shortlisted?: boolean;
}) {
  const { data, actor, change } = useMarketplace();
  const pool = useDiscoveryCreators();
  const [selected, setSelected] = useState<string | null>(null);
  const apps = applicationService
    .list(data, actor)
    .filter(
      (a) =>
        (!campaignId || a.campaignId === campaignId) &&
        (!shortlisted || a.status === "Shortlisted"),
    );
  return (
    <div className="application-list">
      {!apps.length && (
        <EmptyState
          title="No applications here yet"
          description={
            actor.role === "Brand"
              ? "Publish a campaign and invite creators. New submissions will appear here."
              : "Apply to a public campaign to track its status here."
          }
        >
          <Action href="/campaigns">Browse campaigns</Action>
        </EmptyState>
      )}
      {apps.map((a) => {
        const c =
          actor.role === "Creator"
            ? a.campaignSnapshot || readableCampaign(data, actor, a.campaignId)
            : data.campaigns.find((c) => c.id === a.campaignId);
        if (!c) return null;
        const creator = applicationCreator(a, pool);
        const match = creator
          ? matchingService.matchCreatorsToCampaign(c, [creator])[0]
          : null;
        return (
          <Card className="panel" key={a.id}>
            <div className="row">
              <h3>
                {creator?.name || "Creator"} · {c.title}
              </h3>
              <Badge>{a.status}</Badge>
              {a.demo && <Badge>Demo application</Badge>}
            </div>
            <p className="profile-bio">{a.message}</p>
            <p className="small-note">
              Submitted {new Date(a.submittedAt).toLocaleDateString()}
            </p>
            {a.availability && <p>Availability: {a.availability}</p>}
            {a.terms && <p>Proposed terms: {a.terms}</p>}
            <div className="row">
              {creator?.username && (
                <Action href={`/profile/${creator.username}`} secondary>
                  View creator
                </Action>
              )}
              {a.portfolio.startsWith("/u/") && (
                <Action href={a.portfolio} secondary>
                  View portfolio
                </Action>
              )}
              <Button
                variant="outline"
                onClick={() => setSelected(selected === a.id ? null : a.id)}
              >
                Evidence & HECX match
              </Button>
              <Action
                href={`/messages?campaign=${c.id}&creator=${a.creatorId}`}
                secondary
              >
                Message {actor.role === "Brand" ? "creator" : "brand"}
              </Action>
              {actor.role === "Brand" &&
                ["Pending", "Shortlisted"].includes(a.status) &&
                (["Shortlisted", "Accepted", "Rejected"] as const)
                  .filter((x) => x !== a.status)
                  .map((status) => (
                    <ConfirmAction
                      key={status}
                      label={
                        status === "Shortlisted"
                          ? "Shortlist"
                          : status === "Accepted"
                            ? "Accept"
                            : "Reject"
                      }
                      description={`Set this application to ${status}. The creator will receive an in-app notification.`}
                      onConfirm={async () =>
                        await change((s) =>
                          applicationService.review(s, actor, a.id, status),
                        )
                      }
                    />
                  ))}
              {actor.role === "Creator" &&
                ["Pending", "Shortlisted"].includes(a.status) && (
                  <ConfirmAction
                    label="Withdraw"
                    description="Withdraw this application? You can submit another application while the campaign is open."
                    onConfirm={async () =>
                      await change((s) =>
                        applicationService.review(s, actor, a.id, "Withdrawn"),
                      )
                    }
                  />
                )}
            </div>
            {selected === a.id && (
              <div className="section-copy">
                <h4>Submitted project evidence</h4>
                {creator?.projects
                  .filter((p) => a.projects.includes(p.name))
                  .map((p) => (
                    <div key={p.name}>
                      <strong>{p.name}</strong>
                      <p>{p.detail}</p>
                    </div>
                  ))}
                {!a.projects.length && <p>No projects selected.</p>}
                {match ? (
                  <MatchAnalysis match={match} />
                ) : (
                  <p>
                    Creator evidence is unavailable; no score can be calculated.
                  </p>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
export function InvitationsPage() {
  return (
    <Access>
      <PageTitle
        eyebrow="INVITATIONS"
        title="An invitation to collaborate."
        description="Campaign invitations and responses are saved to your account."
      />
      <InvitationsContent />
    </Access>
  );
}
export function InvitationsContent({ campaignId }: { campaignId?: string }) {
  const { data, actor, change } = useMarketplace();
  const pool = useDiscoveryCreators();
  const invitations = invitationService
    .list(data, actor)
    .filter((i) => !campaignId || i.campaignId === campaignId);
  return (
    <div className="application-list">
      {!invitations.length && (
        <EmptyState
          title="No invitations yet"
          description={
            actor.role === "Brand"
              ? "Open campaign matches and invite a creator to start a conversation."
              : "Invitations from brands will appear here when a brand invites you."
          }
        />
      )}{" "}
      {invitations.map((i) => {
        const c =
          actor.role === "Creator"
            ? i.campaignSnapshot || readableCampaign(data, actor, i.campaignId)
            : data.campaigns.find((c) => c.id === i.campaignId);
        if (!c) return null;
        return (
          <Card key={i.id} className="panel">
            <Badge>{i.status}</Badge>
            {i.demo && <Badge>Demo invitation</Badge>}
            <h3>
              {c.title} ·{" "}
              {pool.find((c) => c.id === i.creatorId)?.name || "Creator"}
            </h3>
            <p>{i.message}</p>
            {i.note && <p>{i.note}</p>}
            <Budget campaign={c} />
            <p>Deadline: {c.applicationDeadline || "Not specified"}</p>
            <div className="row">
              <Action href={`/campaigns/${c.id}`} secondary>
                View campaign
              </Action>
              <Action
                href={`/messages?campaign=${c.id}&creator=${i.creatorId}`}
                secondary
              >
                Message
              </Action>
              {i.status === "Pending" &&
                (actor.role === "Brand"
                  ? (["Cancelled"] as const)
                  : (["Accepted", "Declined"] as const)
                ).map((status) => (
                  <ConfirmAction
                    key={status}
                    label={
                      status === "Cancelled"
                        ? "Cancel invitation"
                        : status === "Accepted"
                          ? "Accept invitation"
                          : "Decline invitation"
                    }
                    description={
                      status === "Accepted"
                        ? "Accept the invitation. Submit an application from the campaign page to share your portfolio and project evidence."
                        : "Update this invitation status."
                    }
                    onConfirm={async () =>
                      await change((s) =>
                        invitationService.respond(s, actor, i.id, status),
                      )
                    }
                  />
                ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
export function CampaignMatches({ id }: { id: string }) {
  return (
    <Access role="Brand">
      <Matches id={id} />
    </Access>
  );
}
function Matches({ id }: { id: string }) {
  const { data, actor } = useMarketplace();
  const pool = useDiscoveryCreators();
  const c = data.campaigns.find((c) => c.id === id && owns(actor, c));
  const [skill, setSkill] = useState(""),
    [identity, setIdentity] = useState("All identities"),
    [category, setCategory] = useState("All categories"),
    [experience, setExperience] = useState("Any experience"),
    [availability, setAvailability] = useState("Any availability"),
    [portfolio, setPortfolio] = useState(false),
    [minimum, setMinimum] = useState(0),
    [sort, setSort] = useState("Best match"),
    [detail, setDetail] = useState<CreatorMatch | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const matching = useMatches();
  const computed = {
    matches: matching.matches[id] || [],
    failed: !!matching.error,
  };
  if (!c)
    return (
      <EmptyState
        title="Campaign unavailable"
        description="Matching is available only for campaigns in your brand workspace."
      >
        <Action href="/brand">Brand dashboard</Action>
      </EmptyState>
    );
  const results = filterMatches(computed.matches, pool, {
    minimum,
    skill,
    identity,
    category,
    experience,
    availability,
    portfolio,
    sort,
  });
  const filters = (
    <>
      <div className="campaign-filters">
        <label className="field">
          Skill
          <Input value={skill} onChange={(e) => setSkill(e.target.value)} />
        </label>
        <label className="field">
          Minimum match: {minimum}%
          <input
            type="range"
            min="0"
            max="100"
            value={minimum}
            onChange={(e) => setMinimum(Number(e.target.value))}
          />
        </label>
        <Choice
          label="Creator identity"
          value={identity}
          options={[
            "All identities",
            ...new Set(pool.map((c) => c.identity).filter(Boolean)),
          ]}
          onChange={setIdentity}
        />
        <Choice
          label="Category"
          value={category}
          options={[
            "All categories",
            ...new Set(
              pool
                .flatMap((c) => [c.category, ...(c.categories || [])])
                .filter(Boolean),
            ),
          ]}
          onChange={setCategory}
        />
        {pool.some((c) => c.experienceLevel) && (
          <Choice
            label="Experience"
            value={experience}
            options={[
              "Any experience",
              ...new Set(
                pool
                  .map((c) => c.experienceLevel)
                  .filter((x): x is NonNullable<typeof x> => !!x),
              ),
            ]}
            onChange={setExperience}
          />
        )}
        <Choice
          label="Availability"
          value={availability}
          options={[
            "Any availability",
            ...new Set(
              pool
                .map((c) => c.availability)
                .filter(
                  (x): x is NonNullable<typeof x> =>
                    !!x && x !== "Not specified",
                ),
            ),
          ]}
          onChange={setAvailability}
        />
        <label className="check-label">
          <input
            type="checkbox"
            checked={portfolio}
            onChange={(e) => setPortfolio(e.target.checked)}
          />
          Public portfolio
        </label>
        <Choice
          label="Match sort"
          value={sort}
          options={[
            "Best match",
            "Most evidence",
            "Highest skill match",
            ...(pool.some((c) => c.joinedAt) ? ["Recently joined"] : []),
          ]}
          onChange={setSort}
        />
      </div>
      <p className="small-note">
        Budget, audience, platform and recent-activity filters are unavailable
        because the creator dataset does not contain those measurements.
      </p>
    </>
  );
  return (
    <div className="page-enter">
      <PageTitle
        eyebrow="HECX / CAMPAIGN MATCHES"
        title={`Find people for ${c.title}.`}
        description="Every score is based on listed evidence. Unknown factors remain unknown."
      >
        <Action href={`/campaigns/${id}`} secondary>
          Back to campaign
        </Action>
      </PageTitle>
      <div className="desktop-campaign-filters">
        <details className="campaign-filter-sheet" open>
          <summary>Filter & sort matches</summary>
          {filters}
        </details>
      </div>
      <div className="mobile-campaign-filters">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Filter & sort matches</Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="campaign-filter-bottom">
            <SheetTitle>Filter creator matches</SheetTitle>
            <SheetDescription>
              Use only evidence-backed filters.
            </SheetDescription>
            {filters}
          </SheetContent>
        </Sheet>
      </div>
      {matching.loading ? (
        <p role="status">Analyzing campaign evidence…</p>
      ) : error || computed.failed ? (
        <EmptyState
          title="HECX matching unavailable"
          description="The matching service could not complete this comparison. Try again."
        >
          <Button
            onClick={() => {
              setError(false);
              setRetry(retry + 1);
              matching.retry();
            }}
          >
            Retry
          </Button>
        </EmptyState>
      ) : (
        <>
          <p role="status">
            HECX found {results.length} creators for this comparison.
          </p>
          <div className="creator-grid campaign-matches">
            {results.map((m) => {
              const creator = pool.find((c) => c.id === m.creatorId)!;
              return (
                <div key={m.creatorId} className="match-result">
                  <Card className="panel match-summary">
                    <Badge tone="purple">
                      {m.score === null
                        ? "Insufficient evidence"
                        : `${m.score}% HECX match`}
                    </Badge>
                    <p>{m.coverage}% evidence coverage</p>
                    <p>
                      {m.strengths[0] || "No positive factor evidence yet."}
                    </p>
                    <Button
                      className="ai-action"
                      variant="outline"
                      onClick={() => setDetail(m)}
                    >
                      Why this creator?
                    </Button>
                  </Card>
                  <CreatorCard creator={creator} campaignId={id} />
                </div>
              );
            })}
          </div>
          {!results.length && (
            <EmptyState
              title="No creators match these filters"
              description="Lower the minimum score or remove filters. HECX will not invent creator evidence."
            />
          )}
        </>
      )}
      {detail && (
        <Dialog open onOpenChange={(v) => !v && setDetail(null)}>
          <DialogContent className="mark-dialog campaign-dialog">
            <DialogTitle>Why this creator?</DialogTitle>
            <DialogDescription>
              Evidence-based comparison with {c.title}.
            </DialogDescription>
            <MatchAnalysis match={detail} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
export function SavedCreatorsPage() {
  return (
    <Access role="Brand">
      <SavedCreators />
    </Access>
  );
}
function SavedCreators() {
  const { state } = useApp();
  const { data, actor, change } = useMarketplace();
  const pool = useDiscoveryCreators();
  const [group, setGroup] = useState("All groups");
  const saved = pool.filter((c) => state.brandSaved.includes(c.id));
  return (
    <>
      <PageTitle
        eyebrow="BRAND / SAVED CREATORS"
        title="Keep good possibilities close."
        description="Organize saved creators using your own group names."
      />
      <Choice
        label="Saved creator group"
        value={group}
        options={[
          "All groups",
          ...new Set(saved.map((c) => data.savedGroups[c.id] || "Ungrouped")),
        ]}
        onChange={setGroup}
      />
      <div className="creator-grid">
        {saved
          .filter(
            (c) =>
              group === "All groups" ||
              (data.savedGroups[c.id] || "Ungrouped") === group,
          )
          .map((c) => (
            <div key={c.id}>
              <label className="field">
                Group for {c.name}
                <Input
                  defaultValue={data.savedGroups[c.id] || ""}
                  placeholder="Ungrouped"
                  maxLength={80}
                  onBlur={async (e) =>
                    await change((s) =>
                      savedCreatorService.organize(
                        s,
                        actor,
                        c.id,
                        e.target.value,
                        state.brandSaved,
                      ),
                    )
                  }
                />
              </label>
              <CreatorCard creator={c} />
            </div>
          ))}
      </div>
      {!saved.length && (
        <EmptyState
          title="No saved creators"
          description="Save creators from Discover or campaign matches to build your shortlist."
        >
          <Action href="/creators">Discover creators</Action>
        </EmptyState>
      )}
    </>
  );
}
