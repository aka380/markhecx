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
    if (!resource.data) return resource.data;
    const samples = builtInCreators.filter((creator) => creator.source === "sample");
    const ids = new Set(resource.data.creators.map((creator) => creator.id));
    const creators = [
      ...resource.data.creators,
      ...samples.filter((creator) => !ids.has(creator.id)),
    ];
    return { ...resource.data, creators, total: creators.length };
  }, [resource.data]);
  return { ...resource, data };
}
export function useDiscoveryCreators() {
  return useDiscoveryResource().data?.creators || [];
}
