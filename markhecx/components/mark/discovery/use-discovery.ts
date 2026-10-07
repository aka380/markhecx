"use client";
import { useApp } from "../provider";
import { discoveryCreators } from "@/lib/mark/discovery";
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
    if (!resource.data)
      return resource.error
        ? { creators: samples, total: samples.length, page: 1, pages: 1 }
        : resource.data;
    const ids = new Set(resource.data.creators.map((creator) => creator.id));
    const creators = [
      ...resource.data.creators,
      ...samples.filter((creator) => !ids.has(creator.id)),
    ];
    return { ...resource.data, creators, total: creators.length };
  }, [resource.data, resource.error, localMode, state.publication]);
  return {
    ...resource,
    data,
    error: data && resource.error ? undefined : resource.error,
    loading: data ? false : resource.loading,
  };
}
export function useDiscoveryCreators() {
  return useDiscoveryResource().data?.creators || [];
}
