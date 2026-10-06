import type { CreativeCapabilities } from "./creative";
import { searchCreatorPool } from "./creator-search";
export type Creator = {
  creative?: CreativeCapabilities;
  avatar?: string;
  source?: "sample" | "local";
  availability?: "Available" | "Open to Opportunities" | "Not specified";
  experienceLevel?: "Beginner" | "Intermediate" | "Advanced";
  joinedAt?: string;
  publicPortfolio?: boolean;
  categories?: string[];
  achievementCount?: number;
  id: string;
  name: string;
  username: string;
  identity: string;
  category: string;
  bio: string;
  skills: string[];
  projects: { name: string; detail: string }[];
  badge: string;
  color: string;
  featured: boolean;
  trending: boolean;
  tags: string[];
};
export const creators: Creator[] = [
  {
    id: "ava-chen",
    name: "Ava Chen",
    username: "avachen",
    identity: "Product Designer",
    category: "Design",
    bio: "Turning complex ideas into thoughtful digital experiences. Exploring the space between design and technology.",
    skills: ["UI/UX", "Figma", "Design systems"],
    projects: [
      {
        name: "Forma",
        detail: "A modular design system for thoughtful products.",
      },
      { name: "Mindful", detail: "A calmer approach to daily planning." },
      { name: "Orbit", detail: "Making creative collaboration feel natural." },
    ],
    badge: "Design storyteller",
    color: "violet",
    featured: true,
    trending: false,
    tags: ["Minimalist", "SaaS"],
  },
  {
    id: "marcus-reed",
    name: "Marcus Reed",
    username: "marcusbuilds",
    identity: "Full-stack Developer",
    category: "Development",
    bio: "Building useful things for the web. Open-source enthusiast with a love for beautiful, accessible interfaces.",
    skills: ["React", "TypeScript", "Node.js"],
    projects: [
      {
        name: "DevSpace",
        detail: "An open workspace for independent developers.",
      },
      { name: "Pulse API", detail: "A lightweight service health monitor." },
    ],
    badge: "Open-source builder",
    color: "blue",
    featured: true,
    trending: true,
    tags: ["Open source", "Web"],
  },
  {
    id: "sana-patel",
    name: "Sana Patel",
    username: "sana.ai",
    identity: "AI Engineer",
    category: "AI & Data",
    bio: "Making machine learning understandable and useful. Curious about human-centered AI and creative tools.",
    skills: ["Python", "Machine learning", "LLMs"],
    projects: [
      { name: "Lens", detail: "An experiment in visual understanding." },
      { name: "Context", detail: "A research assistant prototype." },
      { name: "Signal", detail: "Finding patterns in everyday data." },
    ],
    badge: "AI explorer",
    color: "pink",
    featured: true,
    trending: true,
    tags: ["Research", "AI"],
  },
  {
    id: "leo-martin",
    name: "Leo Martin",
    username: "leomotion",
    identity: "Motion Designer",
    category: "Design",
    bio: "Stories in motion. Creating playful identities and expressive digital experiences.",
    skills: ["Motion", "After Effects", "3D"],
    projects: [{ name: "Fluid", detail: "A motion identity exploration." }],
    badge: "Creative explorer",
    color: "amber",
    featured: false,
    trending: true,
    tags: ["Animation", "Branding"],
  },
  {
    id: "nia-james",
    name: "Nia James",
    username: "niawrites",
    identity: "Content Strategist",
    category: "Writing",
    bio: "Helping good ideas find the right words. Writing about technology, creativity, and the people behind it.",
    skills: ["Writing", "Strategy", "Storytelling"],
    projects: [
      {
        name: "Field Notes",
        detail: "A collection of stories from independent creators.",
      },
      { name: "Plain Words", detail: "A practical content design guide." },
    ],
    badge: "Community voice",
    color: "green",
    featured: false,
    trending: false,
    tags: ["Editorial", "Content"],
  },
  {
    id: "ryan-kim",
    name: "Ryan Kim",
    username: "ryankim",
    identity: "Brand Designer",
    category: "Marketing",
    bio: "Distinct identities for ambitious ideas. A blend of strategy, typography, and a little experimentation.",
    skills: ["Branding", "Art direction", "Strategy"],
    projects: [
      {
        name: "Kin Studio",
        detail: "Identity for an independent creative studio.",
      },
    ],
    badge: "Identity maker",
    color: "violet",
    featured: false,
    trending: false,
    tags: ["Branding", "Creative"],
  },
  // Explicit fictional fixtures, never injected into authenticated user records.
  {
    id: "iman-noor",
    name: "Iman Noor",
    username: "imannotes",
    identity: "Researcher",
    category: "AI & Technology",
    bio: "Exploring how people learn with interactive explanations.",
    skills: ["Python", "Data visualization", "Research"],
    projects: [
      {
        name: "Learning Atlas",
        detail: "An interactive map of learning resources.",
      },
    ],
    badge: "",
    color: "violet",
    featured: false,
    trending: false,
    tags: ["Education", "Research"],
    availability: "Open to Opportunities",
    experienceLevel: "Intermediate",
    joinedAt: "2026-09-28",
    publicPortfolio: true,
  },
  {
    id: "maya-ortiz",
    name: "Maya Ortiz",
    username: "mayateaches",
    identity: "Educator",
    category: "Education",
    bio: "Making programming concepts approachable through small experiments.",
    skills: ["Teaching", "JavaScript", "Writing"],
    projects: [
      {
        name: "Code Garden",
        detail: "A collection of beginner programming exercises.",
      },
    ],
    badge: "",
    color: "pink",
    featured: true,
    trending: false,
    tags: ["Learning", "Programming"],
    availability: "Available",
    experienceLevel: "Intermediate",
    joinedAt: "2026-09-16",
    publicPortfolio: true,
  },
  {
    id: "eli-park",
    name: "Eli Park",
    username: "elilearns",
    identity: "Student",
    category: "Programming",
    bio: "Learning to build accessible tools for everyday tasks.",
    skills: ["HTML", "CSS", "Python"],
    projects: [],
    badge: "",
    color: "violet",
    featured: false,
    trending: false,
    tags: ["Learning", "Accessibility"],
    availability: "Not specified",
    experienceLevel: "Beginner",
    joinedAt: "2026-10-02",
    publicPortfolio: false,
  },
  {
    id: "sam-rivera",
    name: "Sam Rivera",
    username: "sammakes",
    identity: "Founder",
    category: "Programming",
    bio: "Prototyping small tools for independent creative teams.",
    skills: ["Prototyping", "React", "Product strategy"],
    projects: [
      {
        name: "Gather",
        detail: "A prototype for planning team feedback sessions.",
      },
    ],
    badge: "",
    color: "pink",
    featured: false,
    trending: true,
    tags: ["Collaboration", "Tools"],
    availability: "Open to Opportunities",
    joinedAt: "2026-09-21",
    publicPortfolio: true,
  },
  {
    id: "jules-owen",
    name: "Jules Owen",
    username: "julesplays",
    identity: "Content Creator",
    category: "Gaming",
    bio: "Making short explainers about game design and creative play.",
    skills: ["Video editing", "Storytelling", "Game design"],
    projects: [
      { name: "Play Notes", detail: "A series of game-design explainers." },
    ],
    badge: "",
    color: "violet",
    featured: false,
    trending: false,
    tags: ["Video", "Creative play"],
    availability: "Available",
    joinedAt: "2026-09-30",
    publicPortfolio: true,
  },
  {
    id: "ada-lin",
    name: "Ada Lin",
    username: "adacreates",
    identity: "AI Creator",
    category: "AI & Technology",
    bio: "Exploring creative coding and explainable machine learning.",
    skills: ["Python", "Machine learning", "Creative coding"],
    projects: [
      {
        name: "Pattern Studio",
        detail: "A visual playground for exploring generated patterns.",
      },
    ],
    badge: "",
    color: "pink",
    featured: false,
    trending: true,
    tags: ["AI", "Generative art"],
    experienceLevel: "Advanced",
    joinedAt: "2026-10-01",
    publicPortfolio: true,
  },
];
export const categories = [
  "All creators",
  "Design",
  "Development",
  "AI & Data",
  "Writing",
  "Marketing",
];
export const modes = [
  "AI Chat",
  "Profile Analysis",
  "Project Analysis",
  "Skill Analysis",
  "Achievement Analysis",
  "Creator Identity",
  "Portfolio Improvements",
  "Career Insights",
  "Match Analyzer",
  "Workload Analyzer",
];
export const sectionTypes = [
  "Hero",
  "About",
  "Skills",
  "Projects",
  "Experience",
  "Education",
  "Achievements",
  "Contact",
  "GitHub",
  "LinkedIn",
];
export const premiumFeatures = [
  ["AI Pro", "Deeper conversations and focused creative guidance."],
  [
    "Advanced Analytics",
    "Understand how people discover and engage with your work.",
  ],
  [
    "Premium Portfolio",
    "More ways to express your identity through your portfolio.",
  ],
  [
    "Advanced Matching",
    "Find collaborators with complementary skills and interests.",
  ],
  [
    "Unlimited HECX",
    "More room to explore ideas with your creative assistant.",
  ],
];
export function searchCreators(query: string) {
  return searchCreatorPool(creators, query);
}
