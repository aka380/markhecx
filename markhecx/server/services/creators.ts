import { validateWorkspace } from "./validation";
import { randomUUID } from "node:crypto";
import { creatorDocuments, CreatorDocument } from "../models/creators";
import { User } from "../models/auth";
import { emptyState, migrateState } from "../../lib/mark/store";
import {
  profileErrors,
  projectErrors,
  publishPortfolio,
} from "../../lib/mark/domain";
import { discoveryCreators } from "../../lib/mark/discovery";
import { ApiError } from "../middleware/errors";
export async function creatorWorkspace(user: User) {
  const initial = structuredClone(emptyState);
  initial.signedIn = true;
  initial.accountType = user.role;
  initial.profile.name = user.name;
  initial.portfolio.ownerId = user._id;
  await creatorDocuments.updateOne(
    { _id: user._id },
    {
      $setOnInsert: {
        revision: 0,
        state: initial,
        createdAt: user.createdAt,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  return (await creatorDocuments.findOne({ _id: user._id }))!;
}
export async function saveCreator(
  user: User,
  input: unknown,
  revision: number,
  publicationAction?: "none" | "publish" | "unpublish",
) {
  if (user.role !== "Creator")
    throw new ApiError(403, "forbidden", "A Creator account is required.");
  const current = await creatorWorkspace(user);
  const next = migrateState(input);
  validateWorkspace(next);
  if (publicationAction === "none")
    next.publication = current.state.publication;
  if (publicationAction === "unpublish") next.publication = null;
  next.signedIn = true;
  next.accountType = "Creator";
  next.saved = current.state.saved;
  next.brandSaved = [];
  if (
    next.profile.username !== next.profile.username.toLowerCase() ||
    (next.profile.username &&
      !/^[a-z0-9_.-]{3,30}$/.test(next.profile.username))
  )
    throw new ApiError(
      400,
      "username",
      "Use a valid lowercase creator handle.",
    );
  if (next.projects.length > 200)
    throw new ApiError(400, "limit", "Project limit reached.");
  for (const p of next.projects) {
    if (Object.keys(projectErrors(p)).length)
      throw new ApiError(400, "project", "Check project title and links.");
    p.ownerId = user._id;
  }
  if (new Set(next.projects.map((p) => p.id)).size !== next.projects.length)
    throw new ApiError(400, "duplicate", "Project IDs must be unique.");
  next.portfolio.ownerId = user._id;
  // Publishing is always reconstructed from validated source data, never a client-supplied public snapshot.
  if (
    publicationAction === "publish" ||
    JSON.stringify(next.publication) !==
      JSON.stringify(current.state.publication)
  ) {
    if (next.publication) {
      if (Object.keys(profileErrors(next.profile)).length)
        throw new ApiError(
          400,
          "profile",
          "Complete the required profile fields before publishing.",
        );
      next.publication = publishPortfolio(
        next.portfolio,
        next.profile,
        next.projects,
      );
    } else next.publication = null;
  }
  next.portfolio.featuredProjects = next.portfolio.featuredProjects.filter(
    (id) => next.projects.some((p) => p.id === id),
  );
  const changed = (a: unknown, b: unknown) =>
    JSON.stringify(a) !== JSON.stringify(b);
  const kind = changed(next.publication, current.state.publication)
    ? "Updated published portfolio"
    : changed(next.projects, current.state.projects)
      ? "Updated projects"
      : changed(next.profile, current.state.profile)
        ? "Updated creator profile"
        : "Updated portfolio draft";
  next.activity = [
    { id: randomUUID(), text: kind, time: new Date().toISOString() },
    ...current.state.activity,
  ].slice(0, 30);
  const result = await creatorDocuments.findOneAndUpdate(
    { _id: user._id, revision },
    { $set: { state: next, updatedAt: new Date() }, $inc: { revision: 1 } },
    { returnDocument: "after" },
  );
  if (!result)
    throw new ApiError(
      409,
      "stale",
      "Your data changed in another session. Refresh before saving.",
    );
  return result;
}
export function publicCreator(doc: CreatorDocument) {
  if (!doc.state.publication) return null;
  const c = discoveryCreators(doc.state.publication).find(
    (c) => c.source === "local",
  );
  return c
    ? {
        ...c,
        id: doc._id,
        joinedAt: doc.createdAt?.toISOString(),
        source: "local" as const,
      }
    : null;
}
export async function listCreators() {
  const docs = await creatorDocuments
    .find({ "state.publication.portfolio.visibility": "Public" })
    .limit(500)
    .toArray();
  return docs.map(publicCreator).filter(Boolean);
}
