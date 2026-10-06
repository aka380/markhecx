"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/mark/api/client";
/** Public resources invalidate after confirmed edits; abort stale route requests. */
export function useAPIResource<T>(path: string | null) {
  const [result, setResult] = useState<{
    key: string | null;
    data?: T;
    error?: string;
  }>({ key: null });
  const [version, retry] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => retry((v) => v + 1), 250);
    };
    window.addEventListener("markhecx:data", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("markhecx:data", refresh);
    };
  }, []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key: path, data });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setResult({ key: path, error: e.message });
      });
    return () => controller.abort();
  }, [path, version]);
  return {
    data: result.key === path ? result.data : undefined,
    error: result.key === path ? result.error : undefined,
    loading: !!path && result.key !== path,
    retry: () => retry((v) => v + 1),
  };
}
