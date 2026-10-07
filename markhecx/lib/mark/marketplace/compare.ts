import type { Creator } from '../data';
import type { Campaign } from './models';
import type { CreatorComparison } from '../hecx/comparison';
import { matchingService, recommendationLevel } from './matching';

/** Recommendations must clear both evidence and blocking-requirement checks. */
export function compareCreators(campaign: Campaign, creators: Creator[]): CreatorComparison {
  const unique = [...new Map(creators.map(c => [c.id, c])).values()];
  if (unique.length < 2 || unique.length > 4) throw Error('Select 2–4 different creators.');
  const matches = matchingService.matchCreatorsToCampaign(campaign, unique);
  const eligible = matches.filter(m => ['Recommended', 'Strongly recommended'].includes(recommendationLevel(m)));
  const winner = eligible[0];
  const tied = winner && eligible[1]?.score === winner.score && eligible[1]?.coverage === winner.coverage;
  const selected = winner && !tied ? winner : null;
  return {
    campaignId: campaign.id,
    recommendedCreatorId: selected?.creatorId ?? null,
    summary: selected
      ? `${unique.find(c => c.id === selected.creatorId)!.name} leads this shortlist with ${selected.score}% requirement match and ${selected.coverage}% evidence coverage. Validate the supplied portfolio and commercial terms before hiring.`
      : tied ? 'The leading candidates have equal fit and evidence coverage. Review portfolios and request a scoped trial before choosing.'
      : 'No candidate clears the recommendation threshold. Review missing evidence and unmet requirements before selecting anyone.',
    rankedCreatorIds: matches.map(m => m.creatorId),
    candidates: matches.map(m => ({creatorId: m.creatorId, verdict: m.explanation,
      strengthFactorKeys: m.factors.filter(f => f.value === 1).slice(0,6).map(f => f.key),
      concernFactorKeys: m.factors.filter(f => f.value === null || f.value < 1).slice(0,6).map(f => f.key)})),
    nextQuestions: ['Request source assets and a workflow walkthrough.', 'Confirm tool licenses, commercial usage, and third-party asset rights.', 'Agree on revisions, delivery dates, final rates, and required exports.'],
    provider: 'HECX · Deterministic comparison',
  };
}
