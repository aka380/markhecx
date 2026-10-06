"use client";
import { Creator } from "@/lib/mark/data";
import { useAPIResource } from "../api-resource";
export function useDiscoveryResource(query?: string) {
  return useAPIResource<{
    creators: Creator[];
    total?: number;
    page?: number;
    pages?: number;
  }>(query === undefined ? "/creators" : "/creators/search?" + query);
}
export function useDiscoveryCreators() {
  return useDiscoveryResource().data?.creators || [];
}
