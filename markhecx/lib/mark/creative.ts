import { z } from "zod";
const values = z.array(z.string().trim().min(1).max(100)).max(30).default([]);
/** Self-declared creative capabilities, never verification or measured outcomes. */
export const creativeSchema = z.object({
  specialization: z.string().max(200).default(""),
  tools: values,
  models: values,
  contentTypes: values,
  formats: values,
  aspectRatio: z.string().max(50).default(""),
  platforms: values,
  workflow: z.string().max(2000).default(""),
  workflowSteps: values,
  humanContribution: z.string().max(1200).default(""),
  sourceAssets: z.string().max(1200).default(""),
  toolEvidence: values,
  workflowEvidence: values,
  pastWorkEvidence: values,
  commercialUse: z
    .enum(["Unspecified", "Available", "Restricted"])
    .default("Unspecified"),
  minimumBudget: z.number().finite().nonnegative().nullable().default(null),
  currency: z.enum(["USD", "INR", "EUR", "GBP"]).default("USD"),
});
export type CreativeCapabilities = z.infer<typeof creativeSchema>;

/** Combines self-declared profile and published-project capability evidence. */
export function mergeCreativeEvidence(
  profile: CreativeCapabilities | undefined,
  projects: Array<CreativeCapabilities | undefined>,
): CreativeCapabilities | undefined {
  const evidence = [profile, ...projects].filter(
    (item): item is CreativeCapabilities => !!item,
  );
  if (!evidence.length) return undefined;
  const unique = (
    key:
      | "tools"
      | "models"
      | "contentTypes"
      | "formats"
      | "platforms"
      | "workflowSteps"
      | "toolEvidence"
      | "workflowEvidence"
      | "pastWorkEvidence",
  ) => [...new Set(evidence.flatMap((item) => item[key]).filter(Boolean))];
  const first = (
    key:
      | "specialization"
      | "aspectRatio"
      | "workflow"
      | "humanContribution"
      | "sourceAssets",
  ) =>
    evidence.find((item) => item[key].trim())?.[key] || "";
  // Rights for a past project do not establish rights for a new engagement.
  const commercial = profile?.commercialUse;
  return {
    specialization: first("specialization"),
    tools: unique("tools"),
    models: unique("models"),
    contentTypes: unique("contentTypes"),
    formats: unique("formats"),
    aspectRatio: first("aspectRatio"),
    platforms: unique("platforms"),
    workflow: first("workflow"),
    workflowSteps: unique("workflowSteps"),
    humanContribution: first("humanContribution"),
    sourceAssets: first("sourceAssets"),
    toolEvidence: unique("toolEvidence"),
    workflowEvidence: unique("workflowEvidence"),
    pastWorkEvidence: unique("pastWorkEvidence"),
    commercialUse: commercial || "Unspecified",
    minimumBudget: profile?.minimumBudget ?? null,
    currency: profile?.currency || "USD",
  };
}
export const briefDraftSchema = z
  .object({
    title: z.string().max(200).optional(),
    objective: z.string().max(200).optional(),
    timeline: z.string().max(500).optional(),
    deliverables: z.array(z.string().max(500)).max(20).optional(),
    contentType: z.string().max(200),
    style: z.string().max(500),
    platform: z.string().max(100),
    format: z.string().max(100),
    aspectRatio: z.string().max(50),
    commercialUse: z.enum(["Unspecified", "Available", "Restricted"]),
    requirements: z.array(z.string().max(200)).max(20),
  })
  .strict();
export type BriefDraft = z.infer<typeof briefDraftSchema>;
