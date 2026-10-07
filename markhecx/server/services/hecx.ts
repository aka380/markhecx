import { memories } from "../models/memory";
import { emptyState } from "../../lib/mark/store";
import { HecxError } from "../../lib/mark/hecx/contracts";
import { campaigns } from "../models/marketplace";
import { creatorDocuments } from "../models/creators";
import { publicCreator } from "./creators";
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
    async brief(user: User, prompt: string) {
      if (user.role !== "Brand")
        throw new ApiError(403, "forbidden", "A Brand account is required.");
      if (!provider.brief) throw new HecxError("unavailable");
      return {
        draft: await provider.brief(prompt),
        provider: config.HECX_PROVIDER,
        requiresReview: true,
      };
    },
    async explainMatch(user: User, campaignId: string, creatorId: string) {
      const campaign = (await campaigns.findOne({ _id: campaignId }))?.data;
      if (
        !campaign ||
        (user.role === "Brand"
          ? campaign.brandId !== user._id
          : creatorId !== user._id ||
            !["Published", "Active", "Paused", "Completed"].includes(
              campaign.status,
            ))
      )
        throw new ApiError(404, "not_found", "Match unavailable.");
      const doc = await creatorDocuments.findOne({
        _id: creatorId,
        "state.publication.portfolio.visibility": "Public",
      });
      const creator =
        user.role === "Creator"
          ? {
              ...ownerCreator((await creatorWorkspace(user)).state),
              id: user._id,
            }
          : doc
            ? publicCreator(doc)
            : null;
      if (!creator)
        throw new ApiError(404, "not_found", "Creator evidence unavailable.");
      const match = matchingService.matchCreatorsToCampaign(campaign, [
        creator,
      ])[0];
      const context = buildHECXContext(
        { ...structuredClone(emptyState), signedIn: true },
        {
          module: "Match Analyzer",
          message:
            "Explain the deterministic match using only supplied evidence. Do not generate a score.",
        },
      );
      context.profile = null;
      context.projects = [];
      context.portfolio = null;
      context.publicCreator = { ...creator, avatar: undefined };
      context.campaign = {
        name: campaign.title,
        requiredSkills: campaign.requirements.requiredSkills,
        identity: campaign.requirements.creatorIdentity,
        audience: campaign.targetAudience,
        budget: campaign.budget ?? undefined,
      };
      context.deterministicMatch = match;
      return { match, analysis: await provider.analyze(context) };
    },
    async compareCreators(user: User, campaignId: string, creatorIds: string[]) {
      if (user.role !== "Brand")
        throw new ApiError(403, "forbidden", "A Brand account is required.");
      const campaign = (await campaigns.findOne({ _id: campaignId }))?.data;
      if (!campaign || campaign.brandId !== user._id)
        throw new ApiError(404, "not_found", "Campaign not found.");
      const creators = (await listCreators()).filter(
        (creator): creator is NonNullable<typeof creator> =>
          !!creator && creatorIds.includes(creator.id),
      );
      if (creators.length !== creatorIds.length)
        throw new ApiError(404, "not_found", "Creator evidence unavailable.");
      const matches = matchingService.matchCreatorsToCampaign(campaign, creators);
      const candidates = creatorIds.map((creatorId) => ({
        creator: creators.find((creator) => creator.id === creatorId)!,
        match: matches.find((match) => match.creatorId === creatorId)!,
      }));
      if (provider.compareCreators)
        return provider.compareCreators(campaign, candidates);
      const ranked = [...matches].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      return {
        campaignId,
        recommendedCreatorId: ranked[0]?.coverage >= 50 ? ranked[0].creatorId : null,
        summary:
          ranked[0]?.coverage >= 50
            ? "The recommendation follows the strongest evidence-backed requirement match."
            : "There is not enough evidence to recommend one creator responsibly.",
        rankedCreatorIds: ranked.map((match) => match.creatorId),
        candidates: candidates.map(({ creator, match }) => ({
          creatorId: creator.id,
          verdict: match.explanation,
          strengthFactorKeys: match.factors.filter((factor) => factor.value !== null && factor.value > 0).slice(0, 6).map((factor) => factor.key),
          concernFactorKeys: match.factors.filter((factor) => factor.value === null || factor.value === 0).slice(0, 6).map((factor) => factor.key),
        })),
        nextQuestions: ["Confirm availability, scope, final rates and usage rights directly before hiring."],
        provider: "HECX · Deterministic comparison" as const,
      };
    },
    async analyze(user: User, options: HecxOptions) {
      const workspace = await creatorWorkspace(user);
      const preferences = await memories
        .find({ userId: user._id })
        .project({ key: 1, value: 1, _id: 0 })
        .limit(3)
        .toArray();
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
          preferences: preferences.map((p) => ({ key: p.key, value: p.value })),
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
