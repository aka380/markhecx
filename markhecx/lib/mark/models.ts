import type { CreativeCapabilities } from "./creative";
/** Phase 2 domain contracts. Identity, presentation, and assistance are separate. */
export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  accountType: "Creator";
}
export interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency?: "Learning" | "Practicing" | "Advanced";
}
export interface Experience {
  id: string;
  title: string;
  organization?: string;
  period?: string;
  description?: string;
}
export interface Education {
  id: string;
  title: string;
  institution?: string;
  period?: string;
  description?: string;
}
export interface Achievement {
  id: string;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}
export interface SocialLink {
  id: string;
  kind: "GitHub" | "LinkedIn" | "Website";
  url: string;
}
export interface CreatorProfile {
  creative?: CreativeCapabilities;
  name: string;
  username: string;
  identity: string;
  bio: string;
  avatar: string;
  skills: Skill[];
  tags: string[];
  location: string;
  socialLinks: SocialLink[];
  experience: Experience[];
  education: Education[];
  achievements: Achievement[];
}
export interface ProjectMedia {
  id: string;
  type: "image" | "video";
  url: string;
  alt: string;
}
export interface Project {
  creative?: CreativeCapabilities;
  id: string;
  ownerId: string;
  title: string;
  description: string;
  problem: string;
  solution: string;
  contribution: string;
  techStack: string[];
  tags: string[];
  github: string;
  liveDemo: string;
  media: ProjectMedia[];
  date: string;
  status: "Draft" | "Published";
  updatedAt: string;
}
export type SectionType =
  | "Hero"
  | "About"
  | "Skills"
  | "Projects"
  | "Experience"
  | "Education"
  | "Achievements"
  | "GitHub"
  | "LinkedIn"
  | "Contact";
export interface PortfolioSection {
  id: string;
  type: SectionType;
  title: string;
  content: string;
  enabled: boolean;
  source: "profile" | "custom";
}
export interface PortfolioSettings {
  typography: "Standard" | "Expressive";
  layout: "Comfortable" | "Compact";
  appearance: "Subtle" | "Elevated";
  heroStyle: "Left aligned" | "Centered";
  buttonStyle: "Rounded" | "Pill";
}
export type Template = "Minimal" | "Creator" | "Developer" | "AI" | "Editorial";
export type Visibility = "Public" | "Unlisted" | "Private";
export interface Portfolio {
  id: string;
  ownerId: string;
  username: string;
  template: Template;
  sections: PortfolioSection[];
  featuredProjects: string[];
  visibility: Visibility;
  settings: PortfolioSettings;
  status: "Draft" | "Published" | "Unlisted" | "Private";
  savedAt: string | null;
}
export interface Publication {
  profile: CreatorProfile;
  projects: Project[];
  portfolio: Portfolio;
  publishedAt: string;
}
export const OWNER_ID = "local-creator";
export const defaultSettings: PortfolioSettings = {
  typography: "Standard",
  layout: "Comfortable",
  appearance: "Subtle",
  heroStyle: "Left aligned",
  buttonStyle: "Rounded",
};
export const portfolioTypes: SectionType[] = [
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
];
export function blankPortfolio(): Portfolio {
  return {
    id: "my-portfolio",
    ownerId: OWNER_ID,
    username: "",
    template: "Minimal",
    sections: portfolioTypes.map((type) => ({
      id: "section-" + type.toLowerCase(),
      type,
      title: type,
      content: "",
      enabled: true,
      source: "profile",
    })),
    featuredProjects: [],
    visibility: "Private",
    settings: { ...defaultSettings },
    status: "Draft",
    savedAt: null,
  };
}
export function blankProject(): Project {
  return {
    id: crypto.randomUUID(),
    ownerId: OWNER_ID,
    title: "",
    description: "",
    problem: "",
    solution: "",
    contribution: "",
    techStack: [],
    tags: [],
    github: "",
    liveDemo: "",
    media: [],
    date: "",
    status: "Draft",
    updatedAt: new Date().toISOString(),
  };
}
