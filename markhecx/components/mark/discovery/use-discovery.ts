"use client";
import { Creator } from "@/lib/mark/data";
import { useAPIResource } from "../api-resource";
export function useDiscoveryCreators() { return useAPIResource<{creators: Creator[]}>("/creators").data?.creators || []; }
