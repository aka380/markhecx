import { config } from "../config/env";
import { GeminiProvider } from "../providers/gemini";
import { buildHECXContext } from "../../lib/mark/hecx/context";
import { createHECXService } from "../../lib/mark/hecx/service";
import { MockHECXProvider } from "../../lib/mark/hecx/mock-provider";
import type { AIProvider, HecxOptions } from "../../lib/mark/hecx/contracts";
import {
  matchingService,
  ownerCreator,
} from "../../lib/mark/marketplace/matching";
import {
  suggestCampaign,
  CampaignHECXAction,
} from "../../lib/mark/hecx/campaign";
import { creatorWorkspace, listCreators } from "./creators";
import { marketState } from "./marketplace";
import { ApiError } from "../middleware/errors";
import type { User } from "../models/auth";
import type { Campaign } from "../../lib/mark/marketplace/models";
/** Inject a server-only provider here. No client decides the provider, keys, or trusted owner context. */
export function backendHECX(provider: AIProvider = MockHECXProvider) {
  return {
    async analyze(user: User, options: HecxOptions) {
      const workspace = await creatorWorkspace(user);
      const candidate = options.creatorId
        ? (await listCreators()).find((c) => c?.id === options.creatorId)
        : null;
      if (options.creatorId && !candidate)
        throw new ApiError(404, "not_found", "Public creator not found.");
      return createHECXService(
        provider,
        config.HECX_TIMEOUT_MS,
        (state, request) => ({
          ...buildHECXContext(state, request),
          publicCreator:
            candidate && ["AI Chat", "Match Analyzer"].includes(request.module)
              ? { ...candidate, avatar: undefined }
              : null,
        }),
      ).analyze(workspace.state, options);
    },
    async field(action: string, source: string) {
      return createHECXService(provider, config.HECX_TIMEOUT_MS).suggest(
        action as Parameters<
          ReturnType<typeof createHECXService>["suggest"]
        >[0],
        source,
      );
    },
    async campaign(user: User, c: Campaign, action: CampaignHECXAction) {
      if (user.role !== "Brand" || c.brandId !== user._id)
        throw new ApiError(
          403,
          "forbidden",
          "Analyze your own brand campaign.",
        );
      if (provider.campaign) return provider.campaign(action, c);
      return suggestCampaign(action, c);
    },
    async allMatches(user: User) {
      const state = await marketState(user);
      const pool =
        user.role === "Creator"
          ? [
              {
                ...ownerCreator((await creatorWorkspace(user)).state),
                id: user._id,
              },
            ]
          : (await listCreators()).filter(
              (c): c is NonNullable<typeof c> => !!c,
            );
      return Object.fromEntries(
        state.campaigns
          .filter((c) => user.role === "Creator" || c.brandId === user._id)
          .map((c) => [c.id, matchingService.matchCreatorsToCampaign(c, pool)]),
      );
    },
    async matches(user: User, id: string) {
      const state = await marketState(user);
      const c = state.campaigns.find((c) => c.id === id);
      if (!c || (user.role === "Brand" && c.brandId !== user._id))
        throw new ApiError(404, "not_found", "Campaign not found.");
      if (user.role === "Creator") {
        const own = ownerCreator((await creatorWorkspace(user)).state);
        return matchingService.matchCreatorsToCampaign(c, [
          { ...own, id: user._id },
        ]);
      }
      return matchingService.matchCreatorsToCampaign(
        c,
        (await listCreators()).filter((c): c is NonNullable<typeof c> => !!c),
      );
    },
  };
}
export const configuredProvider =
  config.HECX_PROVIDER === "gemini"
    ? new GeminiProvider({
        apiKey: config.GEMINI_API_KEY,
        model: config.GEMINI_MODEL,
        timeoutMs: config.HECX_TIMEOUT_MS,
      })
    : MockHECXProvider;
export const hecxBackend = backendHECX(configuredProvider);
