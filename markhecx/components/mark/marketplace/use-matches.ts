"use client";
import { useMemo } from 'react';
import type { CreatorMatch } from '@/lib/mark/marketplace/models';
import { matchingService, ownerCreator } from '@/lib/mark/marketplace/matching';
import { useAPIResource } from '../api-resource';
import { useApp } from '../provider';
import { useMarketplace } from './provider';
import { useDiscoveryCreators } from '../discovery/use-discovery';
export function useMatches() {
  const { state, user, localMode } = useApp();
  const { data, actor } = useMarketplace();
  const pool = useDiscoveryCreators();
  const result = useAPIResource<{ matches: Record<string, CreatorMatch[]> }>(
    state.signedIn && !localMode ? `/hecx/matches?account=${encodeURIComponent(user?.id || '')}` : null,
  );
  const local = useMemo(() => {
    if (!localMode || !state.signedIn) return {};
    const candidates = state.accountType === 'Brand' ? pool : [{...ownerCreator(state), id: actor.id}];
    return Object.fromEntries(data.campaigns
      .filter(c => c.brandId === actor.id || ['Published','Active','Paused','Completed'].includes(c.status))
      .map(c => [c.id, matchingService.matchCreatorsToCampaign(c, candidates)]));
  }, [localMode, state, pool, data.campaigns, actor.id]);
  return {...result, matches: localMode ? local : state.signedIn ? result.data?.matches || {} : {}};
}
