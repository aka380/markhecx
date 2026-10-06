import { z } from "zod";
export const campaignStatuses = [
  "Draft",
  "Published",
  "Active",
  "Paused",
  "Completed",
  "Archived",
] as const;
export const applicationStatuses = [
  "Pending",
  "Shortlisted",
  "Accepted",
  "Rejected",
  "Withdrawn",
] as const;
export const objectives = [
  "Brand Awareness",
  "Product Launch",
  "Education",
  "Community Growth",
  "App Promotion",
  "Content Creation",
  "Event Promotion",
  "Lead Generation",
];
export const platforms = [
  "YouTube",
  "Instagram",
  "LinkedIn",
  "X",
  "TikTok",
  "Blog",
  "Website",
  "Other",
];
const text = z.string().max(6000);
const strings = z.array(z.string().max(200)).max(40);
export const brandSchema = z.object({
  id: z.string(),
  name: text,
  username: z.string(),
  logo: text,
  industry: text,
  description: text,
  website: text,
  socialLinks: strings,
  location: text,
  companySize: text,
  categories: strings,
  demo: z.boolean(),
});
export type Brand = z.infer<typeof brandSchema>;
export const requirementSchema = z.object({
  requiredSkills: strings,
  preferredSkills: strings,
  creatorIdentity: text,
  categories: strings,
  experienceLevel: text,
  portfolioRequired: z.boolean(),
  availability: text,
});
export type CampaignRequirement = z.infer<typeof requirementSchema>;
export const deliverableSchema = z.object({
  id: z.string(),
  type: text,
  quantity: z.number().int().min(1).max(100),
  description: text,
  deadline: text,
  requirements: text,
});
export type Deliverable = z.infer<typeof deliverableSchema>;
export const campaignSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  title: text,
  category: text,
  objective: text,
  description: text,
  brief: text,
  problem: text,
  outcome: text,
  targetAudience: text,
  keyMessage: text,
  creativeDirection: text,
  restrictions: text,
  requirements: requirementSchema,
  platforms: strings,
  deliverables: z.array(deliverableSchema).max(20),
  budget: z.number().nonnegative().finite().nullable(),
  currency: z.string(),
  startDate: text,
  endDate: text,
  applicationDeadline: text,
  turnaround: text,
  status: z.enum(campaignStatuses),
  createdAt: text,
  updatedAt: text,
  demo: z.boolean(),
});
export type Campaign = z.infer<typeof campaignSchema>;
export const creatorEvidenceSchema = z.object({
  id: z.string(),
  name: text,
  username: text,
  identity: text,
  skills: strings,
  category: text,
  categories: strings,
  projects: z.array(z.object({ name: text, detail: text })),
  publicPortfolio: z.boolean(),
});
export const applicationSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  campaignSnapshot: campaignSchema.optional(),
  creatorId: z.string(),
  message: text,
  creatorSnapshot: creatorEvidenceSchema.optional(),
  portfolio: text,
  projects: strings,
  availability: text,
  terms: text,
  status: z.enum(applicationStatuses),
  submittedAt: text,
  updatedAt: text,
  demo: z.boolean(),
});
export type Application = z.infer<typeof applicationSchema>;
export const invitationSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  campaignSnapshot: campaignSchema.optional(),
  creatorId: z.string(),
  message: text,
  note: text,
  status: z.enum(["Pending", "Accepted", "Declined", "Cancelled"]),
  createdAt: text,
  demo: z.boolean(),
});
export type Invitation = z.infer<typeof invitationSchema>;
export const conversationSchema = z.object({
  campaignTitle: z.string().optional(),
  id: z.string(),
  brandId: z.string(),
  creatorId: z.string(),
  campaignId: z.string(),
  messages: z
    .array(
      z.object({
        id: z.string(),
        sender: z.enum(["Creator", "Brand"]),
        text,
        sentAt: text,
      }),
    )
    .max(200),
});
export type Conversation = z.infer<typeof conversationSchema>;
export const marketplaceSchema = z.object({
  brands: z.array(brandSchema),
  campaigns: z.array(campaignSchema),
  applications: z.array(applicationSchema),
  invitations: z.array(invitationSchema),
  savedCampaigns: strings,
  savedGroups: z.record(z.string()),
  conversations: z.array(conversationSchema),
  activity: z
    .array(z.object({ id: z.string(), brandId: z.string(), text, time: text }))
    .max(100),
});
export type MarketplaceState = z.infer<typeof marketplaceSchema>;
export type Actor = {
  signedIn: boolean;
  role: "Creator" | "Brand";
  id: string;
};
export interface MatchFactor {
  key: string;
  label: string;
  weight: number;
  value: number | null;
  evidence: string;
}
export interface CreatorMatch {
  creatorId: string;
  campaignId: string;
  score: number | null;
  coverage: number;
  factors: MatchFactor[];
  strengths: string[];
  gaps: string[];
  explanation: string;
}
export interface CampaignAnalytics {
  applications: number;
  invitations: number;
  shortlisted: number;
  accepted: number;
  views: null;
}
export function blankCampaign(brandId = "local-brand"): Campaign {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    brandId,
    title: "",
    category: "",
    objective: "",
    description: "",
    brief: "",
    problem: "",
    outcome: "",
    targetAudience: "",
    keyMessage: "",
    creativeDirection: "",
    restrictions: "",
    requirements: {
      requiredSkills: [],
      preferredSkills: [],
      creatorIdentity: "",
      categories: [],
      experienceLevel: "",
      portfolioRequired: false,
      availability: "",
    },
    platforms: [],
    deliverables: [],
    budget: null,
    currency: "USD",
    startDate: "",
    endDate: "",
    applicationDeadline: "",
    turnaround: "",
    status: "Draft",
    createdAt: now,
    updatedAt: now,
    demo: false,
  };
}
