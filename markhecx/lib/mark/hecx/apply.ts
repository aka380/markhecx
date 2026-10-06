import type { AppState } from "../store";
import { changeSchema, HecxChange } from "./contracts";
import { sourceVersion } from "./context";
export function applyHECXChange(
  state: AppState,
  proposal: HecxChange,
  decision: "accept" | "reject",
  edited?: string | string[],
): AppState {
  if (decision === "reject") return state;
  if (!state.signedIn)
    throw Error("Sign in again before applying this suggestion.");
  const change = changeSchema.parse(proposal);
  if (change.sourceVersion !== sourceVersion(state))
    throw Error(
      "Your source data changed. Analyze again before applying this suggestion.",
    );
  const value = edited ?? change.value;
  const next = structuredClone(state);
  const assertBefore = (actual: string | string[]) => {
    if (JSON.stringify(actual) !== JSON.stringify(change.before))
      throw Error("This field changed. Analyze again.");
  };
  if (change.target === "profile.bio" || change.target === "profile.identity") {
    const key = change.target === "profile.bio" ? "bio" : "identity";
    assertBefore(state.profile[key]);
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > (key === "bio" ? 1200 : 100)
    )
      throw Error(`Use a non-empty ${key} within the field limit.`);
    next.profile[key] = value.trim();
  } else if (change.target === "project.description") {
    const project = next.projects.find((p) => p.id === change.targetId);
    if (!project) throw Error("Project no longer exists.");
    assertBefore(project.description);
    if (typeof value !== "string" || !value.trim() || value.length > 6000)
      throw Error("Use a description of 1–6,000 characters.");
    project.description = value.trim();
    project.updatedAt = new Date().toISOString();
  } else if (change.target === "portfolio.hero") {
    const section = next.portfolio.sections.find(
      (s) => s.id === change.targetId && s.type === "Hero",
    );
    if (!section) throw Error("Hero section no longer exists.");
    assertBefore(section.source === "custom" ? section.content : "");
    if (typeof value !== "string" || !value.trim() || value.length > 6000)
      throw Error("Use hero text of 1–6,000 characters.");
    section.content = value.trim();
    section.source = "custom";
  } else {
    if (!Array.isArray(value) || new Set(value).size !== value.length)
      throw Error("Use a unique selection of existing items.");
    if (change.target === "portfolio.order") {
      const ids = state.portfolio.sections.map((s) => s.id);
      assertBefore(ids);
      if (value.length !== ids.length || value.some((id) => !ids.includes(id)))
        throw Error("Include every existing section exactly once.");
      next.portfolio.sections = value.map(
        (id) => next.portfolio.sections.find((s) => s.id === id)!,
      );
    } else {
      assertBefore(state.portfolio.featuredProjects);
      if (
        value.some(
          (id) =>
            !state.projects.some(
              (p) => p.id === id && p.status === "Published",
            ),
        )
      )
        throw Error("Choose only existing published projects.");
      next.portfolio.featuredProjects = [...value];
    }
  }
  if (change.target.startsWith("portfolio.")) {
    next.portfolio.status = "Draft";
    next.portfolio.savedAt = null;
  }
  return next;
}
