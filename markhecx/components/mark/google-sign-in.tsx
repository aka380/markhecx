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
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  useEffect(() => {
    if (!clientId) return;
    let active = true;
    async function setup() {
      try {
        await loadGoogle();
        const challenge = await api<{ nonce: string; clientId: string }>(
          "/auth/google/challenge",
          { method: "POST", quiet: true },
        );
        if (!active || !element.current) return;
        if (challenge.clientId !== clientId)
          throw Error(
            "Google Sign-In configuration does not match the server.",
          );
        window.google!.accounts.id.initialize({
          client_id: clientId,
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
        window.google!.accounts.id.renderButton(element.current, {
          theme: "filled_black",
          size: "large",
          text: link ? "continue_with" : "signin_with",
          shape: "pill",
        });
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void setup();
    return () => {
      active = false;
      window.google?.accounts.id.cancel();
    };
  }, [clientId, role, link, attempt]);
  if (!clientId)
    return (
      <p className="small-note">Google Sign-In is currently unavailable.</p>
    );
  return (
    <div>
      <div
        ref={element}
        style={busy ? { pointerEvents: "none", opacity: 0.6 } : undefined}
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
