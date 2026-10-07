"use client";
import { useMemo } from "react";
import { creators as builtInCreators, type Creator } from "@/lib/mark/data";
import { useAPIResource } from "../api-resource";
export function useDiscoveryResource(query?: string) {
  const resource = useAPIResource<{
    creators: Creator[];
    total?: number;
    page?: number;
    pages?: number;
  }>(query === undefined ? "/creators" : "/creators/search?" + query);
  const data = useMemo(() => {
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
  }, [resource.data, resource.error]);
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
