"use client";
import { useApp } from "../provider";
import { discoveryCreators, readDiscoveryQuery, runDiscovery } from "@/lib/mark/discovery";
import { useMemo } from "react";
import { creators as builtInCreators, type Creator } from "@/lib/mark/data";
import { useAPIResource } from "../api-resource";
export function useDiscoveryResource(query?: string) {
  const { state, localMode } = useApp();
  const resource = useAPIResource<{
    creators: Creator[];
    total?: number;
    page?: number;
    pages?: number;
  }>(localMode ? null : query === undefined ? "/creators" : "/creators/search?" + query);
  const data = useMemo(() => {
    if (localMode) {
      const creators = discoveryCreators(state.publication).filter(c => c.source === "sample" || c.source === "local");
      return { creators, total: creators.length, page: 1, pages: 1 };
    }
    const samples = builtInCreators.filter((creator) => creator.source === "sample");
    if (!resource.data) return undefined;
    const params = new URLSearchParams(query);
    if (!params.has("view")) params.set("view", "All Creators");
    const sampleResults = query === undefined ? samples : runDiscovery(
      samples, readDiscoveryQuery(params, state.signedIn), state.signedIn,
      state.accountType === "Brand" ? state.brandSaved : state.saved,
      state.signedIn ? { profile: state.profile, projects: state.projects } : null,
    ).results;
    const ids = new Set(resource.data.creators.map((creator) => creator.id));
    // Sample records appear once, on page one, and obey the same filters.
    const creators = [
      ...resource.data.creators,
      ...((resource.data.page || 1) === 1 ? sampleResults.filter((creator) => !ids.has(creator.id)) : []),
    ];
    return {
      ...resource.data, creators,
      total: (resource.data.total ?? resource.data.creators.length) + sampleResults.length,
    };
  }, [resource.data, localMode, query, state.publication, state.signedIn, state.accountType, state.brandSaved, state.saved, state.profile, state.projects]);
  return {
    ...resource,
    data,
    error: resource.error,
    loading: data ? false : resource.loading,
  };
}
export function useDiscoveryCreators() {
  return useDiscoveryResource().data?.creators || [];
}
