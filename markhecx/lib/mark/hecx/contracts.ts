import { z } from "zod";
import type { CreatorProfile, Portfolio, Project } from "../models";
import type { Creator } from "../data";
export const hecxModules = [
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
] as const;
export type HecxModule = (typeof hecxModules)[number];
export interface CampaignContext {
  name: string;
  requiredSkills: string[];
  identity?: string;
  audience?: string;
  budget?: number;
  availability?: string;
}
export interface Commitment {
  title: string;
  deadline: string;
  hours: number;
}
export interface WorkloadContext {
  availableHours: number;
  commitments: Commitment[];
}
export interface SessionMessage {
  role: "user" | "assistant";
  text: string;
  module: HecxModule;
}
export interface HecxOptions {
  module: HecxModule;
  message?: string;
  projectId?: string;
  creatorId?: string;
  query?: string;
  goal?: string;
  history?: SessionMessage[];
  campaign?: CampaignContext;
  workload?: WorkloadContext;
}
export type ContextProject = Omit<Project, "media"> & { mediaCount: number };
export interface HecxContext {
  preferences?: { key: string; value: string }[];
  deterministicMatch?: import("../marketplace/models").CreatorMatch;
  module: HecxModule;
  message: string;
  authorized: boolean;
  sourceVersion: string;
  profile: Omit<CreatorProfile, "avatar" | "location"> | null;
  projects: ContextProject[];
  portfolio: Portfolio | null;
  publishedVisibility: string | null;
  publicCreator: Creator | null;
  query: string;
  goal: string;
  history: SessionMessage[];
  campaign?: CampaignContext;
  workload?: WorkloadContext;
}
const text = z.string().max(12000);
const list = z.array(text).max(40);
export const changeSchema = z
  .object({
    id: z.string().min(1),
    label: text,
    target: z.enum([
      "profile.bio",
      "profile.identity",
      "project.description",
      "portfolio.hero",
      "portfolio.order",
      "portfolio.featured",
    ]),
    targetId: z.string().optional(),
    before: z.union([text, list]),
    value: z.union([text, list]),
    reason: text,
    sourceVersion: z.string().min(1),
  })
  .strict();
export type HecxChange = z.infer<typeof changeSchema>;
export const responseSchema = z
  .object({
    module: z.enum(hecxModules),
    summary: text.min(1),
    facts: list,
    strengths: list,
    gaps: list,
    recommendations: list,
    priorityActions: list,
    suggestedChanges: z.array(changeSchema).max(12),
    confidence: z.enum([
      "Based on supplied data",
      "Limited data",
      "Insufficient data",
    ]),
    requiresUserInput: list,
    provider: z.enum([
      "MockHECX · Local deterministic analysis",
      "Gemini · Evidence-grounded analysis",
    ]),
  })
  .strict();
export type HecxResult = z.infer<typeof responseSchema>;
export interface AIProvider {
  brief?(prompt: string): Promise<import("../creative").BriefDraft>;
  campaign?(
    action: string,
    campaign: import("../marketplace/models").Campaign,
  ): Promise<import("../assistance").Suggestion>;
  analyze(context: HecxContext, signal?: AbortSignal): Promise<unknown>;
  suggest(
    action: string,
    source: string,
    signal?: AbortSignal,
  ): Promise<unknown>;
}
export type HecxErrorCode =
  | "configuration"
  | "model_unavailable"
  | "unavailable"
  | "timeout"
  | "invalid"
  | "rate_limit"
  | "cancelled";
export class HecxError extends Error {
  constructor(public code: HecxErrorCode) {
    super(code);
    this.name = "HecxError";
  }
}
export const errorMessage = (error: unknown) =>
  error instanceof HecxError
    ? {
        configuration:
          "HECX AI credentials are missing or were rejected. Check the server configuration.",
        model_unavailable:
          "The configured HECX model is unavailable. Check the server model setting.",
        unavailable: "HECX couldn’t complete this analysis. Please try again.",
        timeout:
          "This analysis took too long. Try again with a smaller selection.",
        invalid:
          "HECX returned an incomplete response. Nothing was changed. Please try again.",
        rate_limit: "HECX is busy. Wait a moment before trying again.",
        cancelled: "Analysis cancelled. Your data has not changed.",
      }[error.code]
    : "HECX couldn’t complete this analysis. Please try again.";
