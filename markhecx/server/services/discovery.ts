import { z } from "zod";
import type { Filter } from "mongodb";
import { creatorDocuments, type CreatorDocument } from "../models/creators";
import { publicCreator } from "./creators";
const value = z.string().trim().max(200).default("");
export const discoveryInput = z.object({
  q: value,
  projects: value,
  portfolio: value,
  availability: value,
  experience: value,
  view: value,
  sort: value,
  skill: z
    .union([z.string().max(100), z.array(z.string().max(100)).max(30)])
    .optional(),
  identity: value,
  category: value,
  tool: value,
  contentType: value,
  platform: value,
  format: value,
  specialization: value,
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export async function searchCreators(raw: unknown) {
  const q = discoveryInput.parse(raw),
    prefix = "state.publication.profile";
  const clauses: Filter<CreatorDocument>[] = [
    { "state.publication.portfolio.visibility": "Public" },
  ];
  for (const [key, path] of Object.entries({
    identity: "identity",
    category: "skills.category",
    tool: "creative.tools",
    contentType: "creative.contentTypes",
    platform: "creative.platforms",
    format: "creative.formats",
    specialization: "creative.specialization",
  })) {
    const v = q[key as keyof typeof q];
    if (key === "category" && v === "Programming") {
      clauses.push({
        [`${prefix}.${path}`]: { $in: ["Programming", "Development"] },
      });
      continue;
    }
    if (key === "category" && v === "AI & Technology") {
      clauses.push({
        [`${prefix}.${path}`]: { $in: ["AI & Technology", "AI & Data"] },
      });
      continue;
    }
    if (typeof v === "string" && v) {
      const pattern = { $regex: ["identity", "category"].includes(key) ? "^" + escape(v) + "$" : escape(v), $options: "i" };
      const profileMatch = { [`${prefix}.${path}`]: pattern };
      clauses.push(path.startsWith("creative.") ? {
        $or: [profileMatch, {
          "state.publication.projects": {
            $elemMatch: { status: "Published", [path]: pattern },
          },
        }],
      } : profileMatch);
    }
  }
  for (const skill of q.skill
    ? Array.isArray(q.skill)
      ? q.skill
      : [q.skill]
    : [])
    clauses.push({
      [`${prefix}.skills.name`]: {
        $regex: "^" + escape(skill) + "$",
        $options: "i",
      },
    });
  for (const term of q.q.split(/\s+/).filter(Boolean))
    clauses.push({
      $or: [
        "name",
        "username",
        "identity",
        "bio",
        "skills.name",
        "skills.category",
        "tags",
        "creative.specialization",
        "creative.tools",
        "creative.models",
        "creative.contentTypes",
        "creative.platforms",
        "creative.formats",
      ]
        .map<Filter<CreatorDocument>>((path) => ({
          [`${prefix}.${path}`]: {
            $regex: path === "skills.category" && term.toLowerCase() === "programming" ? "^(Programming|Development)$" : escape(term.replace(/^@/, "")),
            $options: "i",
          },
        }))
        .concat(
          ["title", "description", "techStack", "tags", "creative.tools", "creative.models", "creative.specialization", "creative.contentTypes", "creative.formats", "creative.platforms"].map((path) => ({
            "state.publication.projects": {
              $elemMatch: { status: "Published", [path]: {
                $regex: escape(term), $options: "i",
              } },
            },
          })),
        ),
    });
  if (q.projects === "Has Projects")
    clauses.push({
      "state.publication.projects": { $elemMatch: { status: "Published" } },
    });
  if (q.projects === "No Projects")
    clauses.push({
      "state.publication.projects": {
        $not: { $elemMatch: { status: "Published" } },
      },
    });
  if (
    q.portfolio === "No Public Portfolio" ||
    q.experience ||
    (q.availability && q.availability !== "Not specified") ||
    ["Featured", "Trending"].includes(q.view)
  )
    clauses.push({ _id: { $in: [] } });
  const filter = { $and: clauses };
  const [total, docs] = await Promise.all([
    creatorDocuments.countDocuments(filter),
    creatorDocuments.aggregate<CreatorDocument>([
      { $match: filter },
      { $addFields: {
        __projectCount: { $size: { $filter: {
          input: { $ifNull: ["$state.publication.projects", []] }, as: "project",
          cond: { $eq: ["$$project.status", "Published"] },
        } } },
        __relevance: { $sum: q.q.split(/\s+/).filter(Boolean).map(term => {
          const escaped = escape(term.replace(/^@/, ""));
          const matches = (path: string, exact = false) => ({ $regexMatch: {
            input: { $ifNull: ["$" + prefix + "." + path, ""] },
            regex: exact ? "^" + escaped + "$" : escaped, options: "i",
          } });
          return { $add: [
            { $cond: [{ $or: [matches("name", true), matches("username", true)] }, 10, 0] },
            { $cond: [{ $anyElementTrue: { $map: {
              input: { $ifNull: ["$" + prefix + ".skills", []] }, as: "skill",
              in: { $regexMatch: { input: "$$skill.name", regex: "^" + escaped + "$", options: "i" } },
            } } }, 5, 0] },
            { $cond: [matches("identity"), 3, 0] },
          ] };
        }) },
      } },
      { $sort: q.sort === "Recently Joined" || q.view === "New Creators"
        ? { createdAt: -1, _id: 1 }
        : q.sort === "Most Projects"
          ? { __projectCount: -1, "state.publication.profile.name": 1, _id: 1 }
          : q.sort === "Most Relevant" || (!q.sort && q.q)
            ? { __relevance: -1, "state.publication.profile.name": 1, _id: 1 }
            : { "state.publication.profile.name": 1, _id: 1 },
      },
      { $skip: (q.page - 1) * q.limit },
      { $limit: q.limit },
      { $unset: ["__projectCount", "__relevance"] },
    ]).toArray(),
  ]);
  return {
    creators: docs.map(publicCreator).filter(Boolean),
    total,
    page: q.page,
    pages: Math.ceil(total / q.limit),
  };
}

/** Facets are independent of the current query and contain only public profile metadata. */
export async function discoveryFacets() {
  const filter = { "state.publication.portfolio.visibility": "Public" };
  const [category, identity, skills] = await Promise.all([
    creatorDocuments.distinct("state.publication.profile.skills.category", filter),
    creatorDocuments.distinct("state.publication.profile.identity", filter),
    creatorDocuments.distinct("state.publication.profile.skills.name", filter),
  ]);
  return { category, identity, skills };
}
