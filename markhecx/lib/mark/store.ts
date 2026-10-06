import { creativeSchema } from "./creative";
import { z } from "zod";
import {
  blankPortfolio,
  CreatorProfile,
  Portfolio,
  Project,
  Publication,
} from "./models";
const sectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
});
const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  proficiency: z.enum(["Learning", "Practicing", "Advanced"]).optional(),
});
const recordBase = {
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
};
export const profileSchema = z.object({
  creative: creativeSchema.optional(),
  name: z.string(),
  username: z.string(),
  identity: z.string(),
  bio: z.string(),
  avatar: z.string(),
  skills: z.union([z.string(), z.array(skillSchema)]).transform((v) =>
    typeof v === "string"
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name, i) => ({
            id: "legacy-skill-" + i,
            name,
            category: "Uncategorized",
          }))
      : v,
  ),
  tags: z.array(z.string()).default([]),
  location: z.string().default(""),
  socialLinks: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(["GitHub", "LinkedIn", "Website"]),
        url: z.string(),
      }),
    )
    .default([]),
  experience: z
    .array(
      z.object({
        ...recordBase,
        organization: z.string().optional(),
        period: z.string().optional(),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        ...recordBase,
        institution: z.string().optional(),
        period: z.string().optional(),
      }),
    )
    .default([]),
  achievements: z
    .array(
      z.object({
        ...recordBase,
        issuer: z.string().optional(),
        date: z.string().optional(),
      }),
    )
    .default([]),
});
const portfolioSectionSchema = sectionSchema.extend({
  type: z.enum([
    "Hero",
    "About",
    "Skills",
    "Projects",
    "Experience",
    "Education",
    "Achievements",
    "GitHub",
    "LinkedIn",
    "Contact",
  ]),
  enabled: z.boolean(),
  source: z.enum(["profile", "custom"]),
});
export const portfolioSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  username: z.string(),
  template: z.enum(["Minimal", "Creator", "Developer", "AI", "Editorial"]),
  sections: z.array(portfolioSectionSchema),
  featuredProjects: z.array(z.string()),
  visibility: z.enum(["Public", "Unlisted", "Private"]),
  settings: z.object({
    typography: z.enum(["Standard", "Expressive"]),
    layout: z.enum(["Comfortable", "Compact"]),
    appearance: z.enum(["Subtle", "Elevated"]),
    heroStyle: z.enum(["Left aligned", "Centered"]),
    buttonStyle: z.enum(["Rounded", "Pill"]),
  }),
  status: z.enum(["Draft", "Published", "Unlisted", "Private"]),
  savedAt: z.string().nullable(),
});
export const projectSchema = z.object({
  creative: creativeSchema.optional(),
  id: z.string(),
  ownerId: z.string(),
  title: z.string(),
  description: z.string(),
  problem: z.string(),
  solution: z.string(),
  contribution: z.string(),
  techStack: z.array(z.string()),
  tags: z.array(z.string()),
  github: z.string(),
  liveDemo: z.string(),
  media: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["image", "video"]),
      url: z.string(),
      alt: z.string(),
    }),
  ),
  date: z.string(),
  status: z.enum(["Draft", "Published"]),
  updatedAt: z.string(),
});
const schema = z.object({
  signedIn: z.boolean(),
  accountType: z.enum(["Creator", "Brand"]).default("Creator"),
  brandSaved: z.array(z.string()).default([]),
  profile: profileSchema,
  saved: z.array(z.string()),
  sections: z.array(sectionSchema),
  published: z.array(sectionSchema).nullable(),
  publishedAt: z.string().nullable(),
  publishedProfile: profileSchema.nullable().optional().default(null),
  activity: z.array(
    z.object({ id: z.string(), text: z.string(), time: z.string() }),
  ),
  projects: z.array(projectSchema).default([]),
  portfolio: portfolioSchema.optional(),
  publication: z
    .object({
      profile: profileSchema,
      projects: z.array(projectSchema),
      portfolio: portfolioSchema,
      publishedAt: z.string(),
    })
    .nullable()
    .default(null),
});
export type Profile = CreatorProfile;
export type Section = z.infer<typeof sectionSchema>;
export interface AppState {
  signedIn: boolean;
  accountType: "Creator" | "Brand";
  brandSaved: string[];
  profile: Profile;
  saved: string[];
  sections: Section[];
  published: Section[] | null;
  publishedAt: string | null;
  publishedProfile: Profile | null;
  activity: { id: string; text: string; time: string }[];
  projects: Project[];
  portfolio: Portfolio;
  publication: Publication | null;
}
export const emptyState: AppState = {
  signedIn: false,
  accountType: "Creator",
  brandSaved: [],
  profile: {
    name: "",
    username: "",
    identity: "",
    bio: "",
    skills: [],
    avatar: "",
    tags: [],
    location: "",
    socialLinks: [],
    experience: [],
    education: [],
    achievements: [],
  },
  saved: [],
  sections: [],
  published: null,
  publishedAt: null,
  publishedProfile: null,
  activity: [],
  projects: [],
  portfolio: blankPortfolio(),
  publication: null,
};
const key = "markhecx.phase2.v1";
const legacyKey = "markhecx.phase1.v1";
export function migrateState(value: unknown): AppState {
  const parsed = schema.parse(value);
  const portfolio = parsed.portfolio ?? {
    ...blankPortfolio(),
    username: parsed.profile.username,
    sections: parsed.sections.length
      ? parsed.sections.map((s) => ({
          ...s,
          type: s.type as Portfolio["sections"][number]["type"],
          enabled: true,
          source: "custom" as const,
        }))
      : blankPortfolio().sections,
  };
  return { ...parsed, portfolio };
}
export const localRepository = {
  read(): AppState {
    try {
      const raw = localStorage.getItem(key) || localStorage.getItem(legacyKey);
      return raw ? migrateState(JSON.parse(raw)) : structuredClone(emptyState);
    } catch {
      return structuredClone(emptyState);
    }
  },
  write(state: AppState) {
    localStorage.setItem(key, JSON.stringify(state));
  },
};
export function newSection(type: string, content = ""): Section {
  return { id: crypto.randomUUID(), type, title: type, content };
}
export function safeLink(value: string, type?: string) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    if (
      type === "GitHub" &&
      u.hostname !== "github.com" &&
      !u.hostname.endsWith(".github.com")
    )
      return null;
    if (
      type === "LinkedIn" &&
      u.hostname !== "linkedin.com" &&
      !u.hostname.endsWith(".linkedin.com")
    )
      return null;
    return u.href;
  } catch {
    return null;
  }
}
