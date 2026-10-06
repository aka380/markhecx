"use client";
import type { CreatorMatch } from "@/lib/mark/marketplace/models";
import { useAPIResource } from "../api-resource";
import { useApp } from "../provider";
export function useMatches() {
  const { state, user } = useApp();
  const result = useAPIResource<{ matches: Record<string, CreatorMatch[]> }>(
    state.signedIn
      ? `/hecx/matches?account=${encodeURIComponent(user?.id || "")}`
      : null,
  );
  return {
    ...result,
    matches: state.signedIn ? result.data?.matches || {} : {},
  };
}
