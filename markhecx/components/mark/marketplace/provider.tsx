"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { toast } from "sonner";
import { MarketplaceState, Actor } from "@/lib/mark/marketplace/models";
import { initialMarketplace } from "@/lib/mark/marketplace/fixtures";
import { localMarketplaceProvider } from "@/lib/mark/marketplace/services";
import { useApp } from "../provider";
const Context = createContext<{
  data: MarketplaceState;
  ready: boolean;
  actor: Actor;
  change: (fn: (s: MarketplaceState) => MarketplaceState) => boolean;
} | null>(null);
export function MarketplaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useApp();
  const [data, setData] = useState(initialMarketplace),
    [ready, setReady] = useState(false);
  const live = useRef(data);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) {
        const loaded = localMarketplaceProvider.read();
        live.current = loaded;
        setData(loaded);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  const change = useCallback(
    (fn: (s: MarketplaceState) => MarketplaceState) => {
      try {
        const next = fn(live.current);
        live.current = next;
        setData(next);
        try {
          localMarketplaceProvider.write(next);
        } catch {
          toast.error(
            "Browser storage is full or unavailable. Changes last only in this session.",
          );
        }
        return true;
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "The change could not be saved.",
        );
        return false;
      }
    },
    [],
  );
  const actor = useMemo<Actor>(
    () => ({
      signedIn: state.signedIn,
      role: state.accountType,
      id: state.accountType === "Brand" ? "local-brand" : "local",
    }),
    [state.signedIn, state.accountType],
  );
  return (
    <Context.Provider
      value={{
        data,
        ready,
        actor,
        change,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMarketplace() {
  const value = useContext(Context);
  if (!value) throw Error("MarketplaceProvider required");
  return value;
}
