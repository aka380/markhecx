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
    if (typeof v === "string" && v)
      clauses.push({
        [`${prefix}.${path}`]: { $regex: escape(v), $options: "i" },
      });
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
        "tags",
        "creative.specialization",
        "creative.tools",
        "creative.models",
        "creative.contentTypes",
        "creative.platforms",
        "creative.formats",
      ]
        .map((path) => ({
          [`${prefix}.${path}`]: {
            $regex: escape(term.replace(/^@/, "")),
            $options: "i",
          },
        }))
        .concat(
          ["title", "description", "techStack", "tags"].map((path) => ({
            ["state.publication.projects." + path]: {
              $regex: escape(term),
              $options: "i",
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
    creatorDocuments
      .find(filter)
      .sort(
        q.sort === "Recently Joined" || q.view === "New Creators"
          ? { createdAt: -1, _id: 1 }
          : { "state.publication.profile.name": 1, _id: 1 },
      )
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .toArray(),
  ]);
  return {
    creators: docs.map(publicCreator).filter(Boolean),
    total,
    page: q.page,
    pages: Math.ceil(total / q.limit),
  };
}
