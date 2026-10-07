import type { Creator } from "../data";
import type { AppState } from "../store";
import { Campaign, CreatorMatch, MatchFactor } from "./models";
import { explainCampaignMatch } from "../hecx/campaign";
import { mergeCreativeEvidence } from "../creative";
const normalize = (s: string) => s.trim().toLowerCase();
function mentionsSkill(text: string, skill: string) {
  const escaped = normalize(skill).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    !!escaped &&
    new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(text)
  );
}
export function ownerCreator(
  s: Pick<AppState, "profile" | "projects" | "publication">,
): Creator {
  const publishedProjects = s.projects.filter((p) => p.status === "Published");
  return {
    id: "local",
    source: "local",
    name: s.profile.name,
    creative: mergeCreativeEvidence(
      s.profile.creative,
      publishedProjects.map((project) => project.creative),
    ),
    username: s.profile.username,
    identity: s.profile.identity,
    bio: s.profile.bio,
    skills: s.profile.skills.map((x) => x.name),
    categories: [...new Set(s.profile.skills.map((x) => x.category))],
    category: s.profile.skills[0]?.category || "",
    projects: publishedProjects.map((p) => ({
      name: p.title,
      detail: [p.description, ...p.techStack].join(" "),
    })),
    publicPortfolio:
      !!s.publication && s.publication.portfolio.visibility === "Public",
    badge: "",
    color: "violet",
    featured: false,
    trending: false,
    tags: s.profile.tags,
  };
}

export type RecommendationLevel =
  | "Strongly recommended"
  | "Recommended"
  | "Possible fit"
  | "Low requirement fit"
  | "More evidence needed";

export function recommendationLevel(
  match: Pick<CreatorMatch, "score" | "coverage"> &
    Partial<Pick<CreatorMatch, "factors">>,
): RecommendationLevel {
  if (match.factors?.some((factor) => factor.blocking && factor.value === 0))
    return "Low requirement fit";
  if (match.score === null || match.coverage < 50) return "More evidence needed";
  if (match.score >= 85) return "Strongly recommended";
  if (match.score >= 70) return "Recommended";
  if (match.score >= 50) return "Possible fit";
  return "Low requirement fit";
}
export function scoreCreator(
  campaign: Campaign,
  c: Creator,
): Omit<CreatorMatch, "strengths" | "gaps" | "explanation"> {
  const r = campaign.requirements;
  const f: MatchFactor[] = [];
  const add = (
    key: string,
    label: string,
    weight: number,
    value: number | null,
    evidence: string,
    blocking = false,
  ) => f.push({ key, label, weight, value, evidence, blocking });
  const overlap = (wanted: string[], actual: string[]) =>
    wanted.filter((w) => actual.some((a) => normalize(a) === normalize(w)));
  if (r.requiredSkills.length) {
    const found = overlap(r.requiredSkills, c.skills);
    add(
      "skills",
      "Required skills",
      35,
      c.skills.length ? found.length / r.requiredSkills.length : null,
      `${found.length}/${r.requiredSkills.length} required skills listed${found.length ? `: ${found.join(", ")}` : ""}. Missing evidence: ${r.requiredSkills.filter((x) => !found.includes(x)).join(", ") || "none"}.`,
      true,
    );
  }
  if (r.preferredSkills.length) {
    const found = overlap(r.preferredSkills, c.skills);
    add(
      "preferred",
      "Preferred skills",
      10,
      c.skills.length ? found.length / r.preferredSkills.length : null,
      `${found.length}/${r.preferredSkills.length} preferred skills listed${found.length ? `: ${found.join(", ")}` : ""}.`,
    );
  }
  if (r.creatorIdentity)
    add(
      "identity",
      "Identity fit",
      15,
      c.identity
        ? Number(normalize(c.identity) === normalize(r.creatorIdentity))
        : null,
      c.identity
        ? `Listed identity: ${c.identity}. Requested: ${r.creatorIdentity}.`
        : "Creator identity not provided.",
    );
  const categories = r.categories.length
    ? r.categories
    : campaign.category
      ? [campaign.category]
      : [];
  if (categories.length) {
    const actual = c.categories?.length
      ? c.categories
      : c.category
        ? [c.category]
        : [];
    const found = overlap(categories, actual);
    add(
      "category",
      "Category fit",
      10,
      actual.length ? Number(found.length > 0) : null,
      `Requested: ${categories.join(", ")}. Listed: ${actual.join(", ") || "not provided"}.`,
    );
  }
  if (r.requiredSkills.length) {
    const projects = c.projects.filter((p) =>
      r.requiredSkills.some((s) => mentionsSkill(`${p.name} ${p.detail}`, s)),
    );
    add(
      "projects",
      "Project relevance",
      15,
      c.projects.length ? Number(projects.length > 0) : null,
      projects.length
        ? `Project text mentions required skills: ${projects.map((p) => p.name).join(", ")}. This is text evidence, not verified proficiency.`
        : c.projects.length
          ? "No project text mentions the required skill terms."
          : "No published project evidence available.",
    );
  }
  if (r.portfolioRequired)
    add(
      "portfolio",
      "Portfolio fit",
      10,
      c.publicPortfolio === undefined
        ? c.source === "local"
          ? null
          : 1
        : Number(c.publicPortfolio),
      c.publicPortfolio === false
        ? "No public portfolio available."
        : "Public portfolio available in the creator dataset.",
      true,
    );
  if (r.experienceLevel)
    add(
      "experience",
      "Experience fit",
      10,
      c.experienceLevel
        ? Number(c.experienceLevel === r.experienceLevel)
        : null,
      c.experienceLevel
        ? `Listed: ${c.experienceLevel}. Requested: ${r.experienceLevel}.`
        : "Experience level not provided.",
    );
  if (r.availability)
    add(
      "availability",
      "Availability fit",
      5,
      c.availability && c.availability !== "Not specified"
        ? Number(c.availability === r.availability)
        : null,
      c.availability && c.availability !== "Not specified"
        ? `Listed: ${c.availability}. Requested: ${r.availability}; confirm actual dates.`
        : "Availability not provided.",
    );
  for (const [key, label, wanted, actual] of [
    ["tools", "Tool fit", campaign.tools || [], c.creative?.tools || []],
    [
      "contentType",
      "Content type fit",
      campaign.contentType ? [campaign.contentType] : [],
      c.creative?.contentTypes || [],
    ],
    [
      "format",
      "Format fit",
      campaign.format ? [campaign.format] : [],
      c.creative?.formats || [],
    ],
  ] as [string, string, string[], string[]][])
    if (wanted.length) {
      const found = overlap(wanted, actual);
      add(
        key,
        label,
        10,
        actual.length ? found.length / wanted.length : null,
        `Requested: ${wanted.join(", ")}. Self-declared: ${actual.join(", ") || "Evidence unavailable"}.`,
        key === "tools",
      );
    }
  if (campaign.commercialUse && campaign.commercialUse !== "Unspecified")
    add(
      "commercial",
      "Commercial use",
      10,
      c.creative?.commercialUse && c.creative.commercialUse !== "Unspecified"
        ? Number(c.creative.commercialUse === campaign.commercialUse)
        : null,
      `Requested: ${campaign.commercialUse}. Self-declared: ${c.creative?.commercialUse || "Evidence unavailable"}; confirm licensing directly.`,
      true,
    );
  if (campaign.aspectRatio)
    add(
      "aspectRatio",
      "Aspect ratio fit",
      10,
      c.creative?.aspectRatio
        ? Number(normalize(c.creative.aspectRatio) === normalize(campaign.aspectRatio))
        : null,
      `Requested: ${campaign.aspectRatio}. Self-declared: ${c.creative?.aspectRatio || "not provided"}; confirm alternate exports directly.`,
    );
  if (campaign.budget !== null)
    add(
      "budget",
      "Budget fit",
      5,
      c.creative?.minimumBudget != null &&
        c.creative.currency === campaign.currency
        ? Number(campaign.budget >= c.creative.minimumBudget)
        : null,
      c.creative?.minimumBudget != null &&
        c.creative.currency === campaign.currency
        ? `Self-declared minimum: ${c.creative.minimumBudget} ${c.creative.currency}; campaign budget: ${campaign.budget}. Confirm terms directly.`
        : "Creator rates are unavailable or use a different currency; budget compatibility cannot be calculated.",
    );
  if (campaign.targetAudience)
    add(
      "audience",
      "Audience fit",
      5,
      null,
      "No creator audience measurements are available.",
    );
  if (campaign.platforms.length)
    add(
      "platform",
      "Platform fit",
      5,
      c.creative?.platforms.length
        ? overlap(campaign.platforms, c.creative.platforms).length /
            campaign.platforms.length
        : null,
      c.creative?.platforms.length
        ? `Self-declared platforms: ${c.creative.platforms.join(", ")}.`
        : "Creator platform capability is not recorded; confirm directly.",
    );
  const known = f.filter((x) => x.value !== null),
    denominator = known.reduce((sum, x) => sum + x.weight, 0),
    total = f.reduce((sum, x) => sum + x.weight, 0);
  return {
    creatorId: c.id,
    campaignId: campaign.id,
    score: denominator
      ? Math.round(
          (known.reduce((sum, x) => sum + x.weight * x.value!, 0) /
            denominator) *
            100,
        )
      : null,
    coverage: total ? Math.round((denominator / total) * 100) : 0,
    factors: f,
  };
}
export interface MatchingProvider {
  match(campaign: Campaign, creators: Creator[]): CreatorMatch[];
}
export const deterministicMatchingProvider: MatchingProvider = {
  match(campaign, creators) {
    return creators
      .map((c) => {
        const raw = scoreCreator(campaign, c);
        return { ...raw, ...explainCampaignMatch(raw) };
      })
      .sort(
        (a, b) =>
          (b.score ?? -1) - (a.score ?? -1) ||
          a.creatorId.localeCompare(b.creatorId),
      );
  },
};
export const matchingService = {
  matchCreatorsToCampaign(
    campaign: Campaign,
    creators: Creator[],
    provider: MatchingProvider = deterministicMatchingProvider,
  ) {
    return provider.match(campaign, creators);
  },
};

export interface MatchFilters {
  minimum: number;
  skill: string;
  identity: string;
  category: string;
  experience: string;
  availability: string;
  portfolio: boolean;
  sort: string;
}
export function filterMatches(
  matches: CreatorMatch[],
  pool: Creator[],
  f: MatchFilters,
) {
  const byId = new Map(pool.map((c) => [c.id, c]));
  return matches
    .filter((m) => {
      const c = byId.get(m.creatorId);
      return (
        c &&
        (f.minimum === 0 || (m.score ?? -1) >= f.minimum) &&
        (!f.skill ||
          c.skills.some((s) => normalize(s).includes(normalize(f.skill)))) &&
        (f.identity === "All identities" || c.identity === f.identity) &&
        (f.category === "All categories" ||
          [c.category, ...(c.categories || [])].includes(f.category)) &&
        (f.experience === "Any experience" ||
          c.experienceLevel === f.experience) &&
        (f.availability === "Any availability" ||
          c.availability === f.availability) &&
        (!f.portfolio || c.publicPortfolio !== false)
      );
    })
    .sort((a, b) => {
      const order =
        f.sort === "Highest skill match"
          ? (b.factors.find((x) => x.key === "skills")?.value ?? -1) -
            (a.factors.find((x) => x.key === "skills")?.value ?? -1)
          : f.sort === "Recently joined"
            ? (byId.get(b.creatorId)?.joinedAt || "").localeCompare(
                byId.get(a.creatorId)?.joinedAt || "",
              )
            : f.sort === "Most evidence"
              ? b.coverage - a.coverage
              : (b.score ?? -1) - (a.score ?? -1);
      return order || a.creatorId.localeCompare(b.creatorId);
    });
}
