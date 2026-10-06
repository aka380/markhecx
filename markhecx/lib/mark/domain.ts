import { creators } from "./data";
import {
  CreatorProfile,
  Portfolio,
  PortfolioSection,
  Project,
  Publication,
  OWNER_ID,
} from "./models";
import { safeLink } from "./store";
export const splitList = (s: string) => [
  ...new Set(
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  ),
];
export function profileErrors(p: CreatorProfile) {
  const errors: Record<string, string> = {};
  if (!p.name.trim()) errors.name = "Name is required.";
  const username = p.username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username))
    errors.username =
      "Use 3–30 letters, numbers, dots, hyphens, or underscores.";
  else if (
    [
      "admin",
      "profile",
      "portfolio",
      "api",
      "settings",
      "mine",
      ...creators.map((c) => c.username.toLowerCase()),
    ].includes(username)
  )
    errors.username = "Username already exists in this demo. Choose another.";
  if (!p.identity.trim()) errors.identity = "Creator identity is required.";
  if (p.skills.length < 3 || p.skills.length > 5)
    errors.skills = "Choose 3–5 skills that represent your work.";
  else if (p.skills.some((s) => !s.name.trim() || !s.category.trim()))
    errors.skills = "Each skill needs a name and category.";
  else if (
    new Set(p.skills.map((s) => s.name.trim().toLowerCase())).size !==
    p.skills.length
  )
    errors.skills = "Each skill should be unique.";
  for (const link of p.socialLinks)
    if (link.url && !safeLink(link.url, link.kind))
      errors[link.kind] =
        `Invalid ${link.kind} URL. Use a secure https:// profile link.`;
  return errors;
}
export function projectErrors(p: Project) {
  const errors: Record<string, string> = {};
  if (!p.title.trim()) errors.title = "Project title required.";
  if (p.github && !safeLink(p.github, "GitHub"))
    errors.github = "Invalid GitHub URL.";
  if (p.liveDemo && !safeLink(p.liveDemo))
    errors.liveDemo = "Invalid live demo URL. Use https://.";
  if (
    p.media.some((m) =>
      m.type === "video"
        ? !safeLink(m.url)
        : !/^data:image\/(png|jpeg|webp);base64,/.test(m.url) &&
          !safeLink(m.url),
    )
  )
    errors.media = "Use a valid image or a secure video URL.";
  return errors;
}
export function selectedProjects(portfolio: Portfolio, projects: Project[]) {
  const available = projects.filter((p) => p.status === "Published");
  return portfolio.featuredProjects.length
    ? available.filter((p) => portfolio.featuredProjects.includes(p.id))
    : available;
}
export function sectionHasData(
  s: PortfolioSection,
  p: CreatorProfile,
  projects: Project[],
  portfolio: Portfolio,
) {
  if (!s.enabled) return false;
  if (s.source === "custom") return !!s.content.trim();
  switch (s.type) {
    case "Hero":
      return !!p.name.trim();
    case "About":
      return !!p.bio.trim();
    case "Skills":
      return p.skills.length > 0;
    case "Projects":
      return selectedProjects(portfolio, projects).length > 0;
    case "Experience":
      return p.experience.length > 0;
    case "Education":
      return p.education.length > 0;
    case "Achievements":
      return p.achievements.length > 0;
    case "GitHub":
    case "LinkedIn":
      return p.socialLinks.some(
        (l) => l.kind === s.type && !!safeLink(l.url, l.kind),
      );
    case "Contact":
      return p.socialLinks.some((l) => !!safeLink(l.url, l.kind));
  }
}
export function visibleSections(
  portfolio: Portfolio,
  p: CreatorProfile,
  projects: Project[],
) {
  return portfolio.sections.filter((s) =>
    sectionHasData(s, p, projects, portfolio),
  );
}
export function moveSection(
  portfolio: Portfolio,
  id: string,
  direction: number,
): Portfolio {
  const sections = [...portfolio.sections];
  const i = sections.findIndex((s) => s.id === id),
    j = i + direction;
  if (i < 0 || j < 0 || j >= sections.length) return portfolio;
  [sections[i], sections[j]] = [sections[j], sections[i]];
  return { ...portfolio, sections };
}
export function publishPortfolio(
  portfolio: Portfolio,
  profile: CreatorProfile,
  projects: Project[],
): Publication {
  const errors = profileErrors(profile);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  if (!visibleSections(portfolio, profile, projects).length)
    throw new Error("Enable at least one section with your information.");
  const time = new Date().toISOString();
  return structuredClone({
    profile,
    projects: projects.filter((p) => p.status === "Published"),
    portfolio: {
      ...portfolio,
      username: profile.username.toLowerCase(),
      status:
        portfolio.visibility === "Public" ? "Published" : portfolio.visibility,
      savedAt: time,
    },
    publishedAt: time,
  });
}
export function canViewPublication(
  publication: Publication | null,
  username: string,
  signedIn: boolean,
) {
  return (
    !!publication &&
    publication.portfolio.username.toLowerCase() === username.toLowerCase() &&
    (publication.portfolio.visibility !== "Private" ||
      (signedIn && publication.portfolio.ownerId === OWNER_ID))
  );
}
