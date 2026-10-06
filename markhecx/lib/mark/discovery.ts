import {
  canonicalCategory,
  creatorCategories,
  normalize,
  searchable,
  searchCreatorPool,
} from "./creator-search";
export { canonicalCategory, creatorCategories };
import { Creator, creators } from "./data";
import { CreatorProfile, Project, Publication, blankPortfolio } from "./models";

export const discoveryCategories = [
  "AI & Technology",
  "Programming",
  "Design",
  "Gaming",
  "Education",
  "Finance",
  "Lifestyle",
  "Fashion",
  "Fitness",
];
export const discoveryViews = [
  "Recommended",
  "Featured",
  "Trending",
  "New Creators",
  "All Creators",
  "Saved",
];
export type DiscoverySort =
  | "Recommended"
  | "Most Relevant"
  | "Trending"
  | "Recently Joined"
  | "Most Projects"
  | "Name A–Z";
export interface CreatorFilters {
  category: string;
  skills: string[];
  identity: string;
  availability: string;
  experience: string;
  projects: string;
  portfolio: string;
}
export interface DiscoveryQuery extends CreatorFilters {
  q: string;
  view: string;
  sort: DiscoverySort;
}
export interface Recommendation {
  creatorId: string;
  weight: number;
  reasons: string[];
}
export interface RecommendationContext {
  profile: CreatorProfile;
  projects: Project[];
}
export interface RecommendationProvider {
  recommend(context: RecommendationContext, pool: Creator[]): Recommendation[];
}
export const emptyFilters: CreatorFilters = {
  category: "",
  skills: [],
  identity: "",
  availability: "",
  experience: "",
  projects: "",
  portfolio: "",
};
export function hasPortfolio(c: Creator) {
  return c.publicPortfolio !== false;
}
export function discoveryCreators(publication: Publication | null): Creator[] {
  if (!publication || publication.portfolio.visibility !== "Public")
    return creators;
  const p = publication.profile;
  const projects = publication.projects.filter((x) => x.status === "Published");
  return [
    ...creators,
    {
      id: "local",
      source: "local",
      name: p.name,
      username: p.username,
      avatar: p.avatar,
      identity: p.identity,
      bio: p.bio,
      category: p.skills[0]?.category || "",
      categories: p.skills.map((s) => s.category),
      skills: p.skills.map((s) => s.name),
      tags: p.tags,
      projects: projects.map((x) => ({
        name: x.title,
        detail: [x.description, ...x.techStack, ...x.tags]
          .filter(Boolean)
          .join(" "),
      })),
      badge: "",
      color: "violet",
      featured: false,
      trending: false,
      publicPortfolio: true,
      achievementCount: p.achievements.length,
    },
  ];
}
export const searchDiscoveryCreators = searchCreatorPool;
export function filterCreators(pool: Creator[], f: CreatorFilters) {
  return pool.filter(
    (c) =>
      (!f.category ||
        creatorCategories(c).includes(canonicalCategory(f.category))) &&
      f.skills.every((s) =>
        c.skills.some((x) => normalize(x) === normalize(s)),
      ) &&
      (!f.identity || c.identity === f.identity) &&
      (!f.availability ||
        (c.availability || "Not specified") === f.availability) &&
      (!f.experience || c.experienceLevel === f.experience) &&
      (!f.projects ||
        (f.projects === "Has Projects"
          ? c.projects.length > 0
          : c.projects.length === 0)) &&
      (!f.portfolio ||
        (f.portfolio === "Has Public Portfolio"
          ? hasPortfolio(c)
          : !hasPortfolio(c))),
  );
}
export function getRecommendations(
  context: RecommendationContext | null,
  pool: Creator[],
): Recommendation[] {
  if (!context) return [];
  const p = context.profile;
  const skills = new Set(p.skills.map((s) => normalize(s.name)));
  const projectSkills = new Set(
    context.projects
      .filter((x) => x.status === "Published")
      .flatMap((x) => x.techStack)
      .map(normalize),
  );
  const interests = new Set(p.tags.map(normalize));
  return pool
    .filter((c) => c.username !== p.username && c.id !== "local")
    .map((c) => {
      const shared = c.skills.filter((s) => skills.has(normalize(s)));
      const related = c.skills.filter(
        (s) => projectSkills.has(normalize(s)) && !skills.has(normalize(s)),
      );
      const tags = c.tags.filter((t) => interests.has(normalize(t)));
      const categories = creatorCategories(c).filter((category) =>
        p.skills.some(
          (skill) => canonicalCategory(skill.category) === category,
        ),
      );
      const sameIdentity =
        !!p.identity.trim() && normalize(c.identity) === normalize(p.identity);
      const reasons = [
        shared.length ? `Shared skills: ${shared.join(", ")}.` : "",
        sameIdentity ? `Same creator identity: ${p.identity}.` : "",
        related.length
          ? `Your published projects use ${related.join(", ")}.`
          : "",
        tags.length ? `Shared interests: ${tags.join(", ")}.` : "",
        categories.length
          ? `Related skill categories: ${categories.join(", ")}.`
          : "",
      ].filter(Boolean);
      return {
        creatorId: c.id,
        weight:
          shared.length * 3 +
          related.length * 2 +
          tags.length +
          categories.length +
          Number(sameIdentity) * 2,
        reasons,
      };
    })
    .filter((r) => r.weight > 0)
    .sort(
      (a, b) => b.weight - a.weight || a.creatorId.localeCompare(b.creatorId),
    );
}
export const localRecommendationProvider: RecommendationProvider = {
  recommend: getRecommendations,
};
export function relevance(c: Creator, query: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return terms.reduce(
    (score, t) =>
      score +
      (normalize(c.name) === t || normalize(c.username) === t ? 10 : 0) +
      (c.skills.some((s) => normalize(s) === t) ? 5 : 0) +
      (normalize(c.identity).includes(t) ? 3 : 0) +
      (normalize(searchable(c)).includes(t) ? 1 : 0),
    0,
  );
}
export function sortCreators(
  pool: Creator[],
  sort: string,
  query = "",
  recommendations: Recommendation[] = [],
) {
  const weights = new Map(recommendations.map((r) => [r.creatorId, r.weight]));
  return [...pool].sort((a, b) => {
    const score =
      sort === "Recommended"
        ? (weights.get(b.id) || 0) - (weights.get(a.id) || 0)
        : sort === "Most Relevant"
          ? relevance(b, query) - relevance(a, query)
          : sort === "Trending"
            ? Number(b.trending) - Number(a.trending)
            : sort === "Recently Joined"
              ? (Date.parse(b.joinedAt || "") || 0) -
                (Date.parse(a.joinedAt || "") || 0)
              : sort === "Most Projects"
                ? b.projects.length - a.projects.length
                : 0;
    return score || a.name.localeCompare(b.name);
  });
}
export function readDiscoveryQuery(
  params: URLSearchParams,
  signedIn: boolean,
  savedRoute = false,
): DiscoveryQuery {
  const aliases: Record<string, string> = {
    "Discover Creators": "All Creators",
    "Featured Creators": "Featured",
    "Trending Creators": "Trending",
    "Saved Creators": "Saved",
    Categories: "All Creators",
  };
  const requested = params.get("view") || "";
  const view = savedRoute
    ? "Saved"
    : aliases[requested] ||
      (discoveryViews.includes(requested)
        ? requested
        : params.get("q")
          ? "All Creators"
          : signedIn
            ? "Recommended"
            : "Featured");
  const sort =
    params.get("sort") ||
    (params.get("q")
      ? "Most Relevant"
      : view === "New Creators"
        ? "Recently Joined"
        : signedIn
          ? "Recommended"
          : "Most Relevant");
  return {
    ...emptyFilters,
    q: params.get("q") || "",
    view,
    sort: ([
      "Recommended",
      "Most Relevant",
      "Trending",
      "Recently Joined",
      "Most Projects",
      "Name A–Z",
    ].includes(sort)
      ? sort
      : "Most Relevant") as DiscoverySort,
    category:
      params.get("category") === "All creators"
        ? ""
        : canonicalCategory(params.get("category") || ""),
    skills: params.getAll("skill"),
    identity: params.get("identity") || "",
    availability: params.get("availability") || "",
    experience: params.get("experience") || "",
    projects: params.get("projects") || "",
    portfolio: params.get("portfolio") || "",
  };
}
export function updateDiscoveryQuery(
  params: URLSearchParams,
  patch: Record<string, string | string[]>,
) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    next.delete(key);
    for (const v of Array.isArray(value) ? value : [value])
      if (v) next.append(key, v);
  }
  return next.toString();
}
export function runDiscovery(
  pool: Creator[],
  query: DiscoveryQuery,
  signedIn: boolean,
  saved: string[],
  context: RecommendationContext | null,
) {
  const recommendations =
    signedIn && context
      ? localRecommendationProvider.recommend(context, pool)
      : [];
  if (!signedIn && ["Saved", "Recommended"].includes(query.view))
    return { results: [], recommendations: [] };
  let results = filterCreators(searchDiscoveryCreators(pool, query.q), query);
  results = results.filter((c) =>
    query.view === "Featured"
      ? c.featured && c.projects.length > 0 && hasPortfolio(c)
      : query.view === "Trending"
        ? c.trending
        : query.view === "New Creators"
          ? !!c.joinedAt
          : query.view === "Saved"
            ? saved.includes(c.id)
            : query.view === "Recommended"
              ? recommendations.some((r) => r.creatorId === c.id)
              : true,
  );
  return {
    results: sortCreators(results, query.sort, query.q, recommendations),
    recommendations,
  };
}
export interface SearchSuggestion {
  type: "Creators" | "Skills" | "Categories" | "Projects";
  label: string;
  value: string;
  detail?: string;
}
export function getSearchSuggestions(
  pool: Creator[],
  query: string,
): SearchSuggestion[] {
  if (!query.trim()) return [];
  const q = normalize(query),
    matches = (s: string) => normalize(s).includes(q);
  const group: SearchSuggestion[][] = [
    pool
      .filter((c) => matches(c.name + " " + c.username))
      .slice(0, 3)
      .map((c) => ({
        type: "Creators",
        label: c.name,
        value: c.name,
        detail: "@" + c.username,
      })),
    [...new Set(pool.flatMap((c) => c.skills))]
      .filter(matches)
      .slice(0, 3)
      .map((s) => ({ type: "Skills", label: s, value: s })),
    [...new Set(pool.flatMap(creatorCategories))]
      .filter(matches)
      .slice(0, 2)
      .map((s) => ({ type: "Categories", label: s, value: s })),
    [...new Set(pool.flatMap((c) => c.projects.map((p) => p.name)))]
      .filter(matches)
      .slice(0, 3)
      .map((s) => ({ type: "Projects", label: s, value: s })),
  ];
  return group.flat();
}
export function popularSearches(pool: Creator[]) {
  return [...new Set(pool.flatMap((c) => c.skills))].slice(0, 5);
}
export function safeDiscoveryReturn(value: string | null) {
  return value && /^\/creators(?:\?[^#]*)?$/.test(value) ? value : "/creators";
}
export function sampleProfile(c: Creator): CreatorProfile {
  return {
    name: c.name,
    username: c.username,
    identity: c.identity,
    bio: c.bio,
    avatar: c.avatar || "",
    skills: c.skills.map((name, i) => ({
      id: c.id + "-skill-" + i,
      name,
      category: canonicalCategory(c.category),
    })),
    tags: c.tags,
    location: "",
    socialLinks: [],
    experience: [],
    education: [],
    achievements: [],
  };
}
export function sampleProjects(c: Creator): Project[] {
  return c.projects.map((p, i) => ({
    id: c.id + "-project-" + i,
    ownerId: c.id,
    title: p.name,
    description: p.detail,
    problem: "",
    solution: "",
    contribution: "",
    techStack: [],
    tags: [],
    github: "",
    liveDemo: "",
    media: [],
    date: "",
    status: "Published",
    updatedAt: "",
  }));
}
export function samplePortfolio(c: Creator) {
  return {
    ...blankPortfolio(),
    id: c.id + "-portfolio",
    ownerId: c.id,
    username: c.username,
    visibility: "Public" as const,
    status: "Published" as const,
  };
}
