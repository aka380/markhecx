import type { Campaign, CreatorMatch } from "../marketplace/models";
import type { Suggestion } from "../assistance";
import { createSuggestion } from "../assistance";
/** Replaceable HECX explanation adapter. Evidence comes exclusively from scoring factors. */
export function explainCampaignMatch(
  result: Pick<CreatorMatch, "factors" | "score" | "coverage">,
) {
  const strengths = result.factors
      .filter((f) => f.value !== null && f.value > 0)
      .map((f) => `${f.label}: ${f.evidence}`),
    gaps = result.factors
      .filter((f) => f.value === null || f.value < 1)
      .map((f) => `${f.label}: ${f.evidence}`);
  const strongest = result.factors
    .filter((f) => f.value !== null && f.value > 0)
    .sort((a, b) => b.weight * b.value! - a.weight * a.value!)[0];
  return {
    strengths,
    gaps,
    explanation:
      result.score === null
        ? "There is not enough comparable evidence to calculate a match. Add requirements and creator evidence."
        : `${result.score}% alignment across known factors; ${result.coverage}% of requested factor weight has evidence. ${strongest ? `Strongest supported factor: ${strongest.label}. ` : ""}${strengths.length ? strengths.join(" ") : "No positive evidence was found in the compared factors."} This is a deterministic comparison, not a prediction of campaign success.`,
  };
}
export const campaignHECXActions = [
  "Improve Campaign Brief",
  "Suggest Creator Skills",
  "Suggest Creator Identity",
  "Improve Deliverables",
  "Analyze Campaign Requirements",
] as const;
export type CampaignHECXAction = (typeof campaignHECXActions)[number];
export function suggestCampaign(
  action: CampaignHECXAction,
  c: Campaign,
): Suggestion {
  const brief = c.brief.trim();
  if (action === "Improve Campaign Brief")
    return createSuggestion("Improve Description", brief);
  if (action === "Improve Deliverables")
    return createSuggestion(
      "Improve Description",
      c.deliverables.map((d) => d.description).join("\n"),
    );
  if (action === "Suggest Creator Skills") {
    const candidates = [...c.requirements.preferredSkills];
    return {
      text: candidates.join(", "),
      reason: candidates.length
        ? "These are preferred skills you already supplied. Review before making them required."
        : "Add preferred skills first. HECX will not invent required capabilities from an empty brief.",
      applicable: !!candidates.length,
    };
  }
  if (action === "Suggest Creator Identity")
    return {
      text: c.requirements.creatorIdentity,
      reason:
        "Review the identity already supplied. No creator identity is inferred without evidence.",
      applicable: !!c.requirements.creatorIdentity,
    };
  const missing = [
    !brief && "Campaign brief",
    !c.requirements.requiredSkills.length && "Required skills",
    !c.deliverables.length && "Deliverables",
    c.budget === null && "Budget (optional)",
    !c.applicationDeadline && "Application deadline (optional)",
    !c.targetAudience && "Target audience (optional)",
  ].filter(Boolean);
  return {
    text: missing.length
      ? `Missing information: ${missing.join(", ")}.`
      : "The core campaign requirements are present. Confirm the brief and deliverables before publishing.",
    reason:
      "Local HECX checklist; no campaign results or business claims are inferred.",
    applicable: false,
  };
}
