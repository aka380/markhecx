"use client";
import { useEffect, useRef, useState } from "react";
import { api, type SessionUser } from "@/lib/mark/api/client";
type GoogleAPI = {
  accounts: {
    id: {
      initialize: (options: Record<string, unknown>) => void;
      renderButton: (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => void;
      cancel: () => void;
    };
  };
};
declare global {
  interface Window {
    google?: GoogleAPI;
  }
}
let loading: Promise<void> | undefined;
function loadGoogle() {
  return (loading ??= new Promise<void>((resolve, reject) => {
    if (window.google) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(Error("Google Sign-In could not load. Check your connection."));
    };
    document.head.appendChild(script);
  }));
}
export function GoogleSignIn({
  role,
  onSession,
  link = false,
}: {
  role: "Creator" | "Brand";
  onSession: (session: {
    user: SessionUser;
    csrfToken: string;
  }) => Promise<void>;
  link?: boolean;
}) {
  const element = useRef<HTMLDivElement>(null),
    callback = useRef(onSession);
  useEffect(() => {
    callback.current = onSession;
  }, [onSession]);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [attempt, retry] = useState(0);
  useEffect(() => {
    const host = element.current;
    let active = true;
    let observer: ResizeObserver | undefined;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    async function setup() {
      try {
        const challenge = await api<{ nonce: string; clientId: string }>(
          "/auth/google/challenge", { method: "POST", quiet: true },
        );
        await loadGoogle();
        if (!active || !element.current) return;
        window.google!.accounts.id.initialize({
          client_id: challenge.clientId,
          nonce: challenge.nonce,
          auto_select: false,
          callback: async (response: { credential?: string }) => {
            if (!active || !response.credential) return;
            setBusy(true);
            setError("");
            try {
              const session = await api<{
                user: SessionUser;
                csrfToken: string;
              }>(link ? "/auth/google/link" : "/auth/google", {
                method: "POST",
                quiet: true,
                body: {
                  credential: response.credential,
                  nonce: challenge.nonce,
                  role,
                },
              });
              await callback.current(session);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          },
        });
        let lastWidth = 0;
        const render = () => {
          if (!active || !element.current) return;
          const width = Math.min(400, Math.floor(element.current.getBoundingClientRect().width));
          if (!width || width === lastWidth) return;
          lastWidth = width;
          element.current.replaceChildren();
          window.google!.accounts.id.renderButton(element.current, {
            theme: "filled_black", size: "large",
            text: link ? "continue_with" : "signin_with", shape: "pill", width,
          });
        };
        render();
        observer = new ResizeObserver(render);
        observer.observe(element.current);
        refresh = setTimeout(() => { if (active) retry(n => n + 1); }, 240000);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void setup();
    return () => {
      active = false;
      observer?.disconnect();
      if (refresh) clearTimeout(refresh);
      host?.replaceChildren();
      window.google?.accounts.id.cancel();
    };
  }, [role, link, attempt]);
  return (
    <div className="google-sign-in" aria-busy={busy}>
      <div
        className="google-sign-in-button"
        ref={element}
        style={{
          width: "100%",
          ...(busy ? { pointerEvents: "none", opacity: 0.6 } : {}),
        }}
      />
      {busy && <p role="status">Verifying Google identity…</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              retry((n) => n + 1);
            }}
          >
            Retry Google Sign-In
          </button>
        </p>
      )}
    </div>
  );
}
