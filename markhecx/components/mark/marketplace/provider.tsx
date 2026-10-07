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
import { api, APIError, dataChanged } from "@/lib/mark/api/client";
import { emptyMarketplace, persistMarket } from "@/lib/mark/api/marketplace";
import { initialMarketplace } from "@/lib/mark/marketplace/fixtures";
import { localMarketplaceProvider } from "@/lib/mark/marketplace/services";
import { useApp } from "../provider";
import { Button } from "../ui";
const Context = createContext<{
  data: MarketplaceState;
  ready: boolean;
  actor: Actor;
  refresh: () => Promise<void>;
  change: (fn: (s: MarketplaceState) => MarketplaceState) => Promise<boolean>;
} | null>(null);
export function MarketplaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state, user, localMode, ready: accountReady } = useApp();
  const [data, setData] = useState(emptyMarketplace),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const live = useRef(data),
    generation = useRef(0),
    queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    const current = ++generation.current;
    const invalidate = () => {
      generation.current++;
    };
    live.current = emptyMarketplace;
    const controller = new AbortController();
    queueMicrotask(() => {
      setData(emptyMarketplace);
      setReady(false);
      setError("");
    });
    if (accountReady && localMode) {
      queueMicrotask(() => {
        if (current !== generation.current) return;
        const fallback = localMarketplaceProvider.read();
        live.current = fallback;
        setData(fallback);
        setReady(true);
      });
    } else if (accountReady)
      api<MarketplaceState>(
        state.signedIn ? "/marketplace" : "/marketplace/public",
        { signal: controller.signal },
      )
        .then((result) => {
          if (current === generation.current) {
            live.current = result;
            setData(result);
            setReady(true);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            if (
              !state.signedIn &&
              e instanceof APIError &&
              [0, 503].includes(e.status)
            ) {
              const fallback = initialMarketplace();
              live.current = fallback;
              setData(fallback);
              setError("");
            } else {
              setError(e.message);
            }
            setReady(true);
          }
        });
    return () => {
      controller.abort();
      invalidate();
    };
  }, [accountReady, state.signedIn, user?.id, retry, localMode]);
  const change = useCallback(
    (fn: (s: MarketplaceState) => MarketplaceState): Promise<boolean> => {
      const current = generation.current;
      const task = queue.current.then(async () => {
        if (current !== generation.current) return false;
        try {
          if (localMode) {
            const result = fn(live.current);
            localMarketplaceProvider.write(result);
            live.current = result;
            setData(result);
            dataChanged();
            return true;
          }
          const result = await persistMarket(live.current, fn(live.current));
          if (current !== generation.current) return false;
          live.current = result;
          setData(result);
          dataChanged();
          return true;
        } catch (e) {
          toast.error((e as Error).message);
          return false;
        }
      });
      queue.current = task;
      return task;
    },
    [localMode],
  );
  const refresh = useCallback((): Promise<void> => {
    const current = generation.current;
    const task = queue.current.then(async () => {
      if (current !== generation.current) return;
      try {
        if (localMode) {
          const result = localMarketplaceProvider.read();
          live.current = result;
          setData(result);
          return;
        }
        const result = await api<MarketplaceState>("/marketplace");
        if (current !== generation.current) return;
        live.current = result;
        setData(result);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
    queue.current = task;
    return task;
  }, [localMode]);
  const actor = useMemo<Actor>(
    () => ({
      signedIn: state.signedIn,
      role: state.accountType,
      id: user?.id || "",
    }),
    [state.signedIn, state.accountType, user?.id],
  );
  return (
    <Context.Provider value={{ data, ready, actor, change, refresh }}>
      {error && (
        <div role="alert" className="info-line">
          {error}
          <Button onClick={() => setRetry((v) => v + 1)}>
            Retry campaigns
          </Button>
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
export function useMarketplace() {
  const value = useContext(Context);
  if (!value) throw Error("MarketplaceProvider required");
  return value;
}
