/** Legacy Phase 1 adapter retained for callers; all analysis delegates to the Phase 4 service. */
import { Profile, Section, emptyState } from "./store";
import { hecxService } from "./hecx/service";
import { hecxModules, HecxModule } from "./hecx/contracts";
export type AnalysisRequest = {
  mode: string;
  message: string;
  profile: Profile | null;
  sections: Section[];
};
export interface HecxService {
  respond(request: AnalysisRequest): Promise<string>;
}
export const demoHecx: HecxService = {
  async respond({ mode, message, profile, sections }) {
    const state = structuredClone(emptyState);
    state.signedIn = !!profile;
    if (profile) state.profile = profile;
    const result = await hecxService.analyze(state, {
      module: hecxModules.includes(mode as HecxModule)
        ? (mode as HecxModule)
        : "AI Chat",
      message,
    });
    const prefix =
      mode === "Profile Analysis" && !profile
        ? "No local profile is available yet.\n"
        : mode === "Portfolio Improvements"
          ? `${sections.filter((s) => s.content.trim()).length} filled sections in the legacy draft.\n`
          : "";
    return (
      prefix +
      result.summary +
      "\n" +
      result.recommendations.join("\n") +
      "\nThis is a scripted example, not a personalized AI analysis."
    );
  },
};
