export type AssistanceAction =
  | "Analyze Profile"
  | "Improve Bio"
  | "Suggest Creator Identity"
  | "Suggest Skills"
  | "Improve Portfolio"
  | "Improve Section"
  | "Generate Structure"
  | "Improve Description"
  | "Suggest Tags"
  | "Improve Technical Explanation"
  | "Summarize Project";
export interface Suggestion {
  text: string;
  reason: string;
  applicable: boolean;
}
export function createSuggestion(
  action: AssistanceAction,
  source: string,
): Suggestion {
  if (!source.trim())
    return {
      text: "",
      reason:
        "Add your own information first. HECX needs real source material and will not invent it.",
      applicable: false,
    };
  const clean = source
    .split("\n")
    .map((line) => line.trim().replace(/ +/g, " "))
    .filter(Boolean)
    .join("\n");
  if (action === "Analyze Profile" || action === "Improve Portfolio")
    return {
      text: clean,
      reason:
        "A local checklist derived from your available data. Nothing has been changed.",
      applicable: false,
    };
  if (action === "Summarize Project")
    return {
      text: clean
        .split(/(?<=[.!?])\s+/)
        .slice(0, 2)
        .join(" "),
      reason:
        "An extractive summary using only the text you supplied. Review it before applying.",
      applicable: true,
    };
  return {
    text: clean,
    reason:
      action === "Generate Structure"
        ? "A structure made only from sections with your information."
        : action === "Suggest Skills" || action === "Suggest Tags"
          ? "Only terms from your own project technologies are proposed."
          : "A conservative formatting pass over your original words. No new claims or facts were added.",
    applicable: true,
  };
}
