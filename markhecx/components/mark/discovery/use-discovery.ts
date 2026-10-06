"use client";
import { Creator } from "@/lib/mark/data";
import { useAPIResource } from "../api-resource";
export function useDiscoveryResource() {
  return useAPIResource<{ creators: Creator[] }>("/creators");
}
export function useDiscoveryCreators() {
  return useDiscoveryResource().data?.creators || [];
}
