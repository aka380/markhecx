import type { AppState } from "../store";
import { discoveryCreators } from "../discovery";
import type { HecxContext, HecxOptions } from "./contracts";
/** Optimistic concurrency token; not authentication or a cryptographic signature. */
export function sourceVersion(state: AppState) {
  const text = JSON.stringify([
    state.signedIn,
    state.profile,
    state.projects,
    state.portfolio,
  ]);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
export function buildHECXContext(
  state: AppState,
  options: HecxOptions,
): HecxContext {
  const pool = discoveryCreators(state.publication);
  const creator = options.creatorId
    ? pool.find((c) => c.id === options.creatorId) || null
    : null;
  const context: HecxContext = {
    module: options.module,
    message: (options.message || "").slice(0, 2000),
    authorized: state.signedIn,
    sourceVersion: state.signedIn ? sourceVersion(state) : "guest",
    profile: null,
    projects: [],
    portfolio: null,
    publishedVisibility: null,
    publicCreator:
      creator && ["AI Chat", "Match Analyzer"].includes(options.module)
        ? { ...creator, avatar: undefined }
        : null,
    query: (options.query || "").slice(0, 200),
    goal: "",
    history: [],
  };
  if (!state.signedIn) return context;
  // No avatars, media bytes, saved lists, private messages, or activity logs enter provider context.
  const p = state.profile;
  const profile = {
    name: p.name,
    username: p.username,
    identity: p.identity,
    bio: p.bio,
    skills: p.skills,
    tags: p.tags,
    socialLinks: p.socialLinks,
    experience: p.experience,
    education: p.education,
    achievements: p.achievements,
  };
  context.profile = structuredClone(profile);
  context.projects = state.projects
    .filter((p) => !options.projectId || p.id === options.projectId)
    .map(({ media, ...project }) => ({
      ...structuredClone(project),
      mediaCount: media.length,
    }));
  context.goal = (options.goal || "").slice(0, 1000);
  context.history = (options.module === "AI Chat" ? options.history || [] : [])
    .slice(-12)
    .map((m) => ({ ...m, text: m.text.slice(0, 2000) }));
  if (
    [
      "AI Chat",
      "Profile Analysis",
      "Portfolio Improvements",
      "Career Insights",
    ].includes(options.module)
  ) {
    context.portfolio = structuredClone(state.portfolio);
    context.publishedVisibility =
      state.publication?.portfolio.visibility || null;
  }
  if (
    options.module === "Skill Analysis" ||
    options.module === "Creator Identity"
  ) {
    context.profile.education = [];
    context.profile.socialLinks = [];
  }
  if (options.module === "Project Analysis") {
    context.profile.education = [];
    context.profile.experience = [];
    context.profile.achievements = [];
    context.profile.socialLinks = [];
  }
  if (options.module === "Achievement Analysis") {
    context.projects = [];
    context.profile.experience = [];
    context.profile.education = [];
    context.profile.socialLinks = [];
  }
  if (options.module === "Match Analyzer") {
    context.projects = context.projects.filter((p) => p.status === "Published");
    context.profile.education = [];
    context.profile.experience = [];
    context.profile.achievements = [];
    context.profile.socialLinks = [];
    if (options.campaign) context.campaign = structuredClone(options.campaign);
  }
  if (options.module === "Workload Analyzer") {
    context.profile = null;
    if (options.workload) context.workload = structuredClone(options.workload);
  }
  return context;
}
