import { ApiError } from "../middleware/errors";
import type { AppState } from "../../lib/mark/store";
import { safeLink } from "../../lib/mark/store";
/** Bound embedded documents before MongoDB writes, including legacy workspace fields. */
export function validateWorkspace(state: AppState) {
  function visit(value: unknown, key = "", depth = 0) {
    if (depth > 15)
      throw new ApiError(
        400,
        "limit",
        "Workspace structure is too deeply nested.",
      );
    if (typeof value === "string") {
      const image = /^(data:image\/(png|jpeg|webp);base64,)/.test(value);
      const limit = image
        ? 3_000_000
        : /^(id|ownerId|username)$/.test(key)
          ? 100
          : 12_000;
      if (value.length > limit)
        throw new ApiError(400, "limit", "A field exceeds the supported size.");
    } else if (Array.isArray(value)) {
      if (value.length > 200)
        throw new ApiError(400, "limit", "A collection exceeds 200 items.");
      const ids = value
        .filter((x) => x && typeof x === "object" && "id" in x)
        .map((x) => x.id);
      if (new Set(ids).size !== ids.length)
        throw new ApiError(
          400,
          "duplicate",
          "Record IDs must be unique within each collection.",
        );
      value.forEach((x) => visit(x, key, depth + 1));
    } else if (value && typeof value === "object")
      for (const [key, child] of Object.entries(value))
        visit(child, key, depth + 1);
  }
  visit(state);
  for (const link of state.profile.socialLinks)
    if (link.url && !safeLink(link.url, link.kind))
      throw new ApiError(400, "link", "Use a valid HTTPS profile link.");
  if (
    state.profile.avatar &&
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
      state.profile.avatar,
    ) &&
    !safeLink(state.profile.avatar)
  )
    throw new ApiError(
      400,
      "avatar",
      "Use a supported image or HTTPS image URL.",
    );
  if (
    state.projects.some(
      (p) =>
        p.media.filter((m) => m.type === "image").length > 3 ||
        p.media.length > 20,
    )
  )
    throw new ApiError(
      400,
      "media",
      "Use at most three images and twenty media items per project.",
    );
}
