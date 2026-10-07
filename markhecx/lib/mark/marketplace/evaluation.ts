import { creators } from "../data";
import { blankCampaign } from "./models";
import { scoreCreator } from "./matching";

export const matchingEvaluationCases = [
  { id: "ai-film", skills: ["AI filmmaking", "Video editing"], category: "AI & Data", expected: "demo-zoya-rao" },
  { id: "generative-art", skills: ["Generative art", "Art direction"], category: "Design", expected: "demo-mira-sen" },
  { id: "ai-animation", skills: ["AI animation", "Storyboarding"], category: "Design", expected: "demo-arjun-kale" },
  { id: "ai-product", skills: ["AI integrations", "API engineering"], category: "Development", expected: "demo-dev-malik" },
  { id: "creative-operations", skills: ["Project management", "Creative operations"], category: "Management", expected: "demo-lena-brooks" },
  { id: "brand-positioning", skills: ["Brand strategy", "Positioning"], category: "Marketing", expected: "demo-kabir-mehta" },
  { id: "social-content", skills: ["Short-form video", "UGC"], category: "Marketing", expected: "demo-sofia-alvarez" },
] as const;

export function evaluateSampleMatching() {
  return matchingEvaluationCases.map((testCase) => {
    const campaign = {
      ...blankCampaign("evaluation-brand"),
      id: `evaluation-${testCase.id}`,
      title: testCase.id,
      category: testCase.category,
      requirements: {
        ...blankCampaign().requirements,
        requiredSkills: [...testCase.skills],
        categories: [testCase.category],
        portfolioRequired: true,
      },
    };
    const ranking = creators
      .filter((creator) => creator.source === "sample")
      .map((creator) => scoreCreator(campaign, creator))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return {
      caseId: testCase.id,
      expectedCreatorId: testCase.expected,
      topCreatorId: ranking[0]?.creatorId ?? null,
      passed: ranking[0]?.creatorId === testCase.expected,
      ranking,
    };
  });
}
