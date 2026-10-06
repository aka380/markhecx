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
  commercialUse: z
    .enum(["Unspecified", "Available", "Restricted"])
    .default("Unspecified"),
  minimumBudget: z.number().finite().nonnegative().nullable().default(null),
  currency: z.enum(["USD", "INR", "EUR", "GBP"]).default("USD"),
});
export type CreativeCapabilities = z.infer<typeof creativeSchema>;
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
