"use client";
import { useMemo } from "react";
import { useApp } from "../provider";
import { discoveryCreators } from "@/lib/mark/discovery";
export function useDiscoveryCreators() {
  const { state } = useApp();
  return useMemo(
    () => discoveryCreators(state.publication),
    [state.publication],
  );
}
