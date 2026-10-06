import { blankCampaign, MarketplaceState, Campaign, Brand } from "./models";
const time = "2026-10-01T09:00:00.000Z";
export const blankBrand: Brand = {
  id: "local-brand",
  name: "",
  username: "",
  logo: "",
  industry: "",
  description: "",
  website: "",
  socialLinks: [],
  location: "",
  companySize: "",
  categories: [],
  demo: false,
};
function campaign(
  id: string,
  title: string,
  category: string,
  skills: string[],
  brief: string,
  status: Campaign["status"] = "Published",
): Campaign {
  return {
    ...blankCampaign("demo-studio"),
    id,
    title,
    category,
    objective: "Education",
    description: brief,
    brief,
    requirements: {
      ...blankCampaign().requirements,
      requiredSkills: skills,
      categories: [category],
      portfolioRequired: true,
    },
    platforms: ["Website"],
    deliverables: [
      {
        id: id + "-deliverable",
        type: "Tutorial",
        quantity: 1,
        description: brief,
        deadline: "",
        requirements: "Explain the approach and share source files.",
      },
    ],
    status,
    createdAt: time,
    updatedAt: time,
    demo: true,
  };
}
export function initialMarketplace(): MarketplaceState {
  return {
    brands: [
      structuredClone(blankBrand),
      {
        ...blankBrand,
        id: "demo-studio",
        name: "Open Chapter Studio",
        username: "openchapter-demo",
        industry: "Creative education",
        description:
          "An illustrative brand for exploring the local campaign workflow.",
        categories: ["Development", "Design", "AI & Data"],
        demo: true,
      },
    ],
    campaigns: [
      campaign(
        "demo-web",
        "Teach a useful React pattern",
        "Development",
        ["React", "TypeScript"],
        "Create a practical tutorial demonstrating an accessible React interface.",
      ),
      campaign(
        "demo-design",
        "Explain a design system",
        "Design",
        ["Figma", "Design systems"],
        "Walk through a reusable component library and its design decisions.",
        "Active",
      ),
      campaign(
        "demo-ai",
        "Make machine learning understandable",
        "AI & Data",
        ["Python", "Machine learning"],
        "Create an introductory explanation of a machine learning experiment.",
      ),
    ],
    applications: [
      {
        id: "demo-app-1",
        campaignId: "demo-web",
        creatorId: "marcus-reed",
        message:
          "Demo application: I would explain a React pattern using a small example.",
        portfolio: "/u/marcusbuilds",
        projects: ["DevSpace"],
        availability: "",
        terms: "",
        status: "Shortlisted",
        submittedAt: time,
        updatedAt: time,
        demo: true,
      },
      {
        id: "demo-app-2",
        campaignId: "demo-design",
        creatorId: "ava-chen",
        message:
          "Demo application: I would walk through the Forma design system.",
        portfolio: "/u/avachen",
        projects: ["Forma"],
        availability: "",
        terms: "",
        status: "Accepted",
        submittedAt: time,
        updatedAt: time,
        demo: true,
      },
    ],
    invitations: [
      {
        id: "demo-invite",
        campaignId: "demo-ai",
        creatorId: "sana-patel",
        message: "Demo invitation to discuss an introductory tutorial.",
        note: "",
        status: "Pending",
        createdAt: time,
        demo: true,
      },
    ],
    savedCampaigns: [],
    savedGroups: {},
    conversations: [],
    activity: [],
  };
}
