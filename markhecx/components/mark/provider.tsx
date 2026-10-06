"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AppState, emptyState, localRepository } from "@/lib/mark/store";
import { toggleSaved } from "@/lib/mark/marketplace/services";
import { useRouter } from "next/navigation";
import { Button, Input, Brand, Badge, Choice } from "./ui";
type Context = {
  state: AppState;
  ready: boolean;
  update: (fn: (s: AppState) => AppState) => void;
  openAuth: (mode?: string) => void;
  logout: () => void;
  toggleSave: (id: string) => void;
  log: (text: string) => void;
};
const Ctx = createContext<Context | null>(null);
export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AppProvider required");
  return ctx;
}
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const liveState = useRef<AppState>(emptyState);
  const router = useRouter();
  const [role, setRole] = useState<"Creator" | "Brand">("Creator");
  const [auth, setAuth] = useState("");
  const [name, setName] = useState("");
  const errorShown = useRef(false);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) {
        const loaded = localRepository.read();
        liveState.current = loaded;
        setState(loaded);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localRepository.write(state);
      errorShown.current = false;
    } catch {
      if (!errorShown.current) {
        toast.error(
          "Browser storage is unavailable or full. Changes will last only for this session.",
        );
        errorShown.current = true;
      }
    }
  }, [state, ready]);
  const update = useCallback((fn: (s: AppState) => AppState) => {
    const next = fn(liveState.current);
    liveState.current = next;
    setState(next);
  }, []);
  const openAuth = useCallback(
    (mode = "Sign In") => {
      setName(state.profile.name);
      setRole(state.accountType);
      setAuth(mode);
    },
    [state.profile.name, state.accountType],
  );
  const logout = () => {
    update((s) => ({ ...s, signedIn: false }));
    toast("Signed out of the local demo.");
  };
  const toggleSave = (id: string) => {
    if (!state.signedIn) {
      openAuth();
      return;
    }
    update((s) => ({
      ...s,
      [s.accountType === "Brand" ? "brandSaved" : "saved"]: toggleSaved(
        s.accountType === "Brand" ? s.brandSaved : s.saved,
        id,
      ),
    }));
  };
  const log = (text: string) =>
    update((s) => ({
      ...s,
      activity: [
        { id: crypto.randomUUID(), text, time: new Date().toISOString() },
        ...s.activity,
      ].slice(0, 30),
    }));
  return (
    <Ctx.Provider
      value={{ state, ready, update, openAuth, logout, toggleSave, log }}
    >
      {children}
      <Toaster theme="dark" position="top-right" richColors />
      <Dialog open={!!auth} onOpenChange={(open) => !open && setAuth("")}>
        <DialogContent className="mark-dialog">
          <Brand />
          <Badge tone="purple">Local demo · No real authentication</Badge>
          <DialogTitle>
            {auth === "Sign Up"
              ? "Make room for your next chapter."
              : "Welcome to your creative space."}
          </DialogTitle>
          <DialogDescription>
            Creator and Brand workspaces share this local demo. No password,
            account verification, or server connection is used.
          </DialogDescription>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              if (role === "Creator" && !name.trim()) return;
              update((s) => ({
                ...s,
                signedIn: true,
                accountType: role,
                profile:
                  role === "Creator"
                    ? { ...s.profile, name: name.trim() }
                    : s.profile,
              }));
              setAuth("");
              router.push(role === "Brand" ? "/brand" : "/");
              toast.success("You’re in. Your local workspace is ready.");
            }}
          >
            <label className="field">
              Account type
              <Choice
                label="Account type"
                value={role}
                options={["Creator", "Brand"]}
                onChange={(value) => setRole(value as "Creator" | "Brand")}
              />
            </label>
            {role === "Creator" && (
              <label className="field">
                Your display name
                <Input
                  autoComplete="nickname"
                  required
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                />
              </label>
            )}
            <Button className="btn-primary" type="submit">
              Continue locally
            </Button>
          </form>
          <p className="small-note">
            Use only information you’re comfortable storing on this device.
            Signing out hides your workspace but keeps your drafts.
          </p>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
export function SignInGate({
  title = "Your own space to create",
  description = "Sign in to the local demo to build your profile and keep your drafts on this browser.",
}: {
  title?: string;
  description?: string;
}) {
  const { openAuth, ready } = useApp();
  return (
    <div className="gate">
      <Brand small />
      <h1>{title}</h1>
      <p>{ready ? description : "Loading your local workspace…"}</p>
      <Button
        className="btn-primary"
        onClick={() => openAuth()}
        disabled={!ready}
      >
        Sign In to local demo
      </Button>
      <span className="small-note">
        Local demo · No production authentication
      </span>
    </div>
  );
}
