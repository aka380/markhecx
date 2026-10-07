import { z } from "zod";

export const comparisonCandidateSchema = z
  .object({
    creatorId: z.string().min(1),
    verdict: z.string().min(1).max(1200),
    strengthFactorKeys: z.array(z.string()).max(6),
    concernFactorKeys: z.array(z.string()).max(6),
  })
  .strict();

export const creatorComparisonSchema = z
  .object({
    campaignId: z.string().min(1),
    recommendedCreatorId: z.string().nullable(),
    summary: z.string().min(1).max(3000),
    rankedCreatorIds: z.array(z.string()).min(2).max(4),
    candidates: z.array(comparisonCandidateSchema).min(2).max(4),
    nextQuestions: z.array(z.string().max(500)).max(6),
    provider: z.enum([
      "Gemini · Evidence-grounded comparison",
      "HECX · Deterministic comparison",
    ]),
  })
  .strict();

export type CreatorComparison = z.infer<typeof creatorComparisonSchema>;
